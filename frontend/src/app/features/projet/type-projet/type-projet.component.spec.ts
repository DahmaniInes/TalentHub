import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypeProjetComponent } from './type-projet.component';

describe('TypeProjetComponent', () => {
  let component: TypeProjetComponent;
  let fixture: ComponentFixture<TypeProjetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypeProjetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TypeProjetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
