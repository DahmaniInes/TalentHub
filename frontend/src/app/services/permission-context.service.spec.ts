import { TestBed } from '@angular/core/testing';

import { PermissionContextService } from './permission-context.service';

describe('PermissionContextService', () => {
  let service: PermissionContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PermissionContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
