import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendrierFtComponent } from './calendrier.component';

describe('CalendrierComponent', () => {
  let component: CalendrierFtComponent;
  let fixture: ComponentFixture<CalendrierFtComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendrierFtComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendrierFtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
