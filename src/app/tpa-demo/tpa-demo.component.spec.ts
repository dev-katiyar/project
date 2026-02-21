import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TpaDemoComponent } from './tpa-demo.component';

describe('TpaDemoComponent', () => {
  let component: TpaDemoComponent;
  let fixture: ComponentFixture<TpaDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TpaDemoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TpaDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
