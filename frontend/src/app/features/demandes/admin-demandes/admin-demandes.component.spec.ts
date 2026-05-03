import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ADMINDEMANDESComponent } from './admin-demandes.component';

describe('ADMINDEMANDESComponent', () => {
  let component: ADMINDEMANDESComponent;
  let fixture: ComponentFixture<ADMINDEMANDESComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ADMINDEMANDESComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ADMINDEMANDESComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
