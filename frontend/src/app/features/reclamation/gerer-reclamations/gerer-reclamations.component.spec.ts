import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GererReclamationsComponent } from './gerer-reclamations.component';

describe('GererReclamationsComponent', () => {
  let component: GererReclamationsComponent;
  let fixture: ComponentFixture<GererReclamationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GererReclamationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GererReclamationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
