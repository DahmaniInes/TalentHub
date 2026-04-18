import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaSemaineComponent } from './ma-semaine.component';

describe('MaSemaineComponent', () => {
  let component: MaSemaineComponent;
  let fixture: ComponentFixture<MaSemaineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaSemaineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaSemaineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
