import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastModalComponentComponent } from './toast-modal-component.component';

describe('ToastModalComponentComponent', () => {
  let component: ToastModalComponentComponent;
  let fixture: ComponentFixture<ToastModalComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastModalComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToastModalComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
