import { TestBed } from '@angular/core/testing';

import { StageAngularService } from './stage.service';

describe('StageService', () => {
  let service: StageAngularService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StageAngularService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
