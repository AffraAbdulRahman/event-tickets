import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CmrlService } from './cmrl.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule]
})
export class AppComponent implements OnInit {
  ticketForm: FormGroup;
  fare: number = 0;
  qrCodeData: string = '';
  showQrCode: boolean = false;
  minDate: string;
  imageUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfiMUryADdWBrBeL4xz9jBUwr-mZwYZE13xA&s';
  stations: any[] = []; // Will contain objects from API like {stationCode, stationName}

  constructor(private fb: FormBuilder, private cmrlService: CmrlService) {
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const yyyy = twoDaysFromNow.getFullYear();
    const mm = String(twoDaysFromNow.getMonth() + 1).padStart(2, '0');
    const dd = String(twoDaysFromNow.getDate()).padStart(2, '0');
    this.minDate = `${yyyy}-${mm}-${dd}`;

    this.ticketForm = this.fb.group({
      origin: ['', Validators.required],
      destination: ['', Validators.required],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      eventDate: [this.minDate, Validators.required],
      numTickets: [1, [Validators.required, Validators.min(1), Validators.max(6)]]
    });

    // Subscribe to form value changes to recalculate fare automatically
    this.ticketForm.valueChanges.subscribe(() => {
      this.calculateFare();
    });
  }

  ngOnInit() {
    // Fetch stations when the component initializes
    this.cmrlService.getStations().subscribe((data) => {
      this.stations = data.result;
      console.log('Stations data:', this.stations);
      
      // IMPORTANT: Commenting out these lines to ensure "Select Origin" and "Select Destination" are the initial defaults.
      // If you want to pre-select stations, uncomment these lines and ensure the 'code' property matches your station data.
      // if (this.stations.length >= 2) {
      //   this.ticketForm.patchValue({
      //     origin: this.stations[0].code,
      //     destination: this.stations[1].code
      //   });
      // }
      
      // Perform an initial fare calculation after stations are loaded and form is initialized
      this.calculateFare();
    });
  }

  // Increments the number of tickets, up to a maximum of 2000
  increment() {
    let count = this.ticketForm.get('numTickets')?.value || 0;
    if (count < 6) {
      this.ticketForm.get('numTickets')?.setValue(count + 1);
    }
  }

  // Decrements the number of tickets, down to a minimum of 1
  decrement() {
    let count = this.ticketForm.get('numTickets')?.value || 0;
    if (count > 1) {
      this.ticketForm.get('numTickets')?.setValue(count - 1);
    }
  }

  // Calculates the fare based on selected origin, destination, and number of tickets
  calculateFare() {
    const { origin, destination, numTickets } = this.ticketForm.value;

    // Reset fare to 0 if any required field is missing or invalid
    if (!origin || !destination || origin === destination || numTickets < 1 || numTickets > 6) {
      this.fare = 0;
      return;
    }

    // Call the CMRL service to get the fare from the API.
    // We are now explicitly requesting fare for 1 ticket, assuming the API returns base fare per ticket.
    this.cmrlService.getFare(origin, destination, 1).subscribe( // Request fare for 1 ticket
      (response) => {
        if (response?.result){
          const baseFarePerTicket = response.result.result;
          // Multiply the base fare by the actual number of tickets selected by the user
          this.fare = baseFarePerTicket * numTickets; 
        } else {
          // If response is not as expected, set fare to 0
          this.fare = 0;
        }
      },
      (error) => {
        // Log any errors during API call and set fare to 0
        console.error('Error fetching fare:', error);
        this.fare = 0;
      }
    );
  }

  // Handles form submission
  onSubmit() {
    // Check if the form is valid and origin/destination are different
    if (this.ticketForm.valid && this.ticketForm.get('origin')?.value !== this.ticketForm.get('destination')?.value) {
      const { origin, destination, mobileNumber, numTickets, eventDate } = this.ticketForm.value;
      
      // Find the full station names based on their codes for QR code data
      const originName = this.stations.find(s => s.code === origin)?.name || origin;
      const destinationName = this.stations.find(s => s.code === destination)?.name || destination;

      // Construct QR code data string
      this.qrCodeData = `CMRL Ticket\nFrom: ${originName}\nTo: ${destinationName}\nMobile: ${mobileNumber}\nEvent Date: ${eventDate}\nTickets: ${numTickets}\nTotal Fare: ₹${this.fare.toFixed(2)}`;
      this.showQrCode = true; // Show the QR code section
    } else {
      this.showQrCode = false; // Hide QR code if form is invalid
      this.ticketForm.markAllAsTouched(); // Mark all fields as touched to show validation errors
      // Using alert for demonstration; consider a custom modal for better UX
      alert('Please fill in all required fields and ensure Origin and Destination are different and number of tickets is valid.');
    }
  }
}