import { TestBed } from '@angular/core/testing';

import { CongeService } from './conge.service';

describe('CongeService', () => {
  let service: CongeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CongeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
