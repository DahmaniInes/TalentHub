import { TestBed } from '@angular/core/testing';

import { JoursFeriesService } from './jours-feries.service';

describe('JoursFeriesService', () => {
  let service: JoursFeriesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JoursFeriesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
