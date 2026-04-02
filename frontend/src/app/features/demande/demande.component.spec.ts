import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemandeComponent } from './demande.component';

describe('DemandeComponent', () => {
  let component: DemandeComponent;
  let fixture: ComponentFixture<DemandeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemandeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DemandeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
