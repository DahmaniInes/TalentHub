import { TestBed } from '@angular/core/testing';

import { FeuilleTempsService } from './feuille-temps.service';

describe('FeuilleTempsService', () => {
  let service: FeuilleTempsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FeuilleTempsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
