import { TestBed } from '@angular/core/testing';

import { PrioriteActiviteService } from './priorite-activite.service';

describe('PrioriteActiviteService', () => {
  let service: PrioriteActiviteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrioriteActiviteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
