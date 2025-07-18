import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CmrlService {
  private stationApiUrl = 'https://quickticketapi.chennaimetrorail.org/api/airtel/stations';
  private fareApiBase = 'https://quickticketapi.chennaimetrorail.org/api/airtel/farebyod';

  constructor(private http: HttpClient) {}

  getStations(): Observable<any> {
    return this.http.get(this.stationApiUrl);
  }

  getFare(originCode: string, destinationCode: string, tickets: number): Observable<any> {
    const url = `${this.fareApiBase}?Origin=${originCode}&Destination=${destinationCode}&TicketType=SJT&NoOfTickets=${tickets}`;
    return this.http.get(url);
  }
}

