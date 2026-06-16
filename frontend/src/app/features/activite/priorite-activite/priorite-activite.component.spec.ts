import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrioriteActiviteComponent } from './priorite-activite.component';

describe('PrioriteActiviteComponent', () => {
  let component: PrioriteActiviteComponent;
  let fixture: ComponentFixture<PrioriteActiviteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrioriteActiviteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrioriteActiviteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
