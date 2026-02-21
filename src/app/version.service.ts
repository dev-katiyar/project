import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VersionService {

  private version: string;

  constructor() { }

  // Method to set version
  setVersion(version: string): void {
    localStorage.setItem('svVersion', version);
    this.version = version;
  }

  // Method to get the version
  getVersion(headerVersion): string {
    // if no version in service, then load from local
    if(!this.version) {
      this.version = localStorage.getItem('svVersion');

      // if no version in localStoarage then set default
      if(!this.version) {
        this.setVersion(headerVersion);
      }
    }

    // return a non-empty version
    return this.version;
  }
}
