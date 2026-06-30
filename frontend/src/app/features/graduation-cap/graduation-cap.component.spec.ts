import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraduationCapComponent } from './graduation-cap.component';

describe('GraduationCapComponent', () => {
  let component: GraduationCapComponent;
  let fixture: ComponentFixture<GraduationCapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraduationCapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraduationCapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
