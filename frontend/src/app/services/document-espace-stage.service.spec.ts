import { TestBed } from '@angular/core/testing';

import { DocumentEspaceStageService } from './document-espace-stage.service';

describe('DocumentEspaceStageService', () => {
  let service: DocumentEspaceStageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocumentEspaceStageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
