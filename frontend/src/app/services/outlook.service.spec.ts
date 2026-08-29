import { TestBed } from '@angular/core/testing';

import { OutlookService } from './outlook.service';

describe('OutlookService', () => {
  let service: OutlookService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OutlookService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
