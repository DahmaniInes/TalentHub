import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypeStageComponent } from './type-stage.component';

describe('TypeStageComponent', () => {
  let component: TypeStageComponent;
  let fixture: ComponentFixture<TypeStageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypeStageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TypeStageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
