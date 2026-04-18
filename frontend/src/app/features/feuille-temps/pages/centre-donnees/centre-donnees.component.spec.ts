import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CentreDonneesComponent } from './centre-donnees.component';

describe('CentreDonneesComponent', () => {
  let component: CentreDonneesComponent;
  let fixture: ComponentFixture<CentreDonneesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CentreDonneesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CentreDonneesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
