import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesEntreesComponent } from './mes-entrees.component';

describe('MesEntreesComponent', () => {
  let component: MesEntreesComponent;
  let fixture: ComponentFixture<MesEntreesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesEntreesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MesEntreesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
