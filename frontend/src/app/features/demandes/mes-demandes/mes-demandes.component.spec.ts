import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MESDEMANDESComponent } from './mes-demandes.component';

describe('MESDEMANDESComponent', () => {
  let component: MESDEMANDESComponent;
  let fixture: ComponentFixture<MESDEMANDESComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MESDEMANDESComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MESDEMANDESComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
