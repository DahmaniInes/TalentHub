import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebugTokenComponent } from './debug-token.component';

describe('DebugTokenComponent', () => {
  let component: DebugTokenComponent;
  let fixture: ComponentFixture<DebugTokenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DebugTokenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DebugTokenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
