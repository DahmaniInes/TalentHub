import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NomenclatureAcademiqueComponent } from './nomenclature-academique.component';

describe('NomenclatureAcademiqueComponent', () => {
  let component: NomenclatureAcademiqueComponent;
  let fixture: ComponentFixture<NomenclatureAcademiqueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NomenclatureAcademiqueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NomenclatureAcademiqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
