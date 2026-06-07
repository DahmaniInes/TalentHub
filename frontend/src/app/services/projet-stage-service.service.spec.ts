import { TestBed } from '@angular/core/testing';

import { ProjetStageServiceService } from './projet-stage-service.service';

describe('ProjetStageServiceService', () => {
  let service: ProjetStageServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjetStageServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
