import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-ai-models-combined',
  templateUrl: './ai-models-combined.component.html',
  styleUrls: ['./ai-models-combined.component.scss'],
})
export class AiModelsCombinedComponent implements OnInit {
  // model related 
  modelKey = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const modelKey = params['modelKey'];
      if (modelKey) {
        this.modelKey = modelKey;
      }
    });
  }
}
