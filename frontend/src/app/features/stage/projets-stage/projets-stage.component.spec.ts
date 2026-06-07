import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjetsStageComponent } from './projets-stage.component';

describe('ProjetsStageComponent', () => {
  let component: ProjetsStageComponent;
  let fixture: ComponentFixture<ProjetsStageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjetsStageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjetsStageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
