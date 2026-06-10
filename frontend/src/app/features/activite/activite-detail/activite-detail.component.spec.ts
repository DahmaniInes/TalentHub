import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiviteDetailComponent } from './activite-detail.component';

describe('ActiviteDetailComponent', () => {
  let component: ActiviteDetailComponent;
  let fixture: ComponentFixture<ActiviteDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiviteDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiviteDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
