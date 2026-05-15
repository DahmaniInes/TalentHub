import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceReclamationComponent } from './service-reclamation.component';

describe('ServiceReclamationComponent', () => {
  let component: ServiceReclamationComponent;
  let fixture: ComponentFixture<ServiceReclamationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceReclamationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceReclamationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
