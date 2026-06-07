import { TestBed } from '@angular/core/testing';

import { NomenclatureAcademiqueServiceService } from './nomenclature-academique-service.service';

describe('NomenclatureAcademiqueServiceService', () => {
  let service: NomenclatureAcademiqueServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NomenclatureAcademiqueServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
