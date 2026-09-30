// Imported verbatim from original thrower.tscn animation tracks. Godot coordinates.
export interface ThrowerTrack {path:string;interpolation:number;times:number[];values:(number|number[])[];}
export const THROWER_ANIMATIONS:Record<string,{duration:number;tracks:ThrowerTrack[]}> = {
  "Idle": {
    "duration": 1,
    "tracks": [
      {
        "path": "Visuals/visuals2/Sprite2D:scale",
        "interpolation": 2,
        "times": [
          0,
          0.5,
          1
        ],
        "values": [
          [
            1,
            1
          ],
          [
            1.1,
            0.9
          ],
          [
            1,
            1
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/LeftClaw:position",
        "interpolation": 2,
        "times": [
          0,
          0.5,
          1
        ],
        "values": [
          [
            2.809279,
            1.7880704
          ],
          [
            0,
            1.1713171
          ],
          [
            2.809279,
            1.7880704
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/RightClaw:position",
        "interpolation": 2,
        "times": [
          0,
          0.5,
          1
        ],
        "values": [
          [
            -5.695839,
            0.23700881
          ],
          [
            -0.95835066,
            8.34465e-7
          ],
          [
            -5.695839,
            0.23700881
          ]
        ]
      }
    ]
  },
  "RESET": {
    "duration": 0.001,
    "tracks": [
      {
        "path": "Visuals/visuals2/Sprite2D:scale",
        "interpolation": 1,
        "times": [
          0
        ],
        "values": [
          [
            1,
            1
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D:rotation",
        "interpolation": 1,
        "times": [
          0
        ],
        "values": [
          0
        ]
      },
      {
        "path": "Visuals:position",
        "interpolation": 1,
        "times": [
          0
        ],
        "values": [
          [
            0,
            0
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/LeftClaw:position",
        "interpolation": 1,
        "times": [
          0
        ],
        "values": [
          [
            -1.4285698,
            0
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/RightClaw:position",
        "interpolation": 1,
        "times": [
          0
        ],
        "values": [
          [
            -1.4285698,
            0
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D:position",
        "interpolation": 1,
        "times": [
          0
        ],
        "values": [
          [
            0,
            0
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/LeftClaw:rotation",
        "interpolation": 1,
        "times": [
          0
        ],
        "values": [
          0
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/RightClaw:rotation",
        "interpolation": 1,
        "times": [
          0
        ],
        "values": [
          0
        ]
      }
    ]
  },
  "Throw": {
    "duration": 1,
    "tracks": [
      {
        "path": "Visuals/visuals2/Sprite2D:rotation",
        "interpolation": 2,
        "times": [
          0,
          0.5,
          1
        ],
        "values": [
          -0.119411975,
          0.09665471,
          -0.119411975
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D:scale",
        "interpolation": 2,
        "times": [
          0,
          0.3,
          0.6,
          1
        ],
        "values": [
          [
            1,
            1
          ],
          [
            1.1,
            0.9
          ],
          [
            0.9,
            1.1
          ],
          [
            1,
            1
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D:position",
        "interpolation": 1,
        "times": [
          0
        ],
        "values": [
          [
            0,
            0
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/LeftClaw:position",
        "interpolation": 2,
        "times": [
          0,
          0.3,
          1
        ],
        "values": [
          [
            -8.433488,
            -23.192091
          ],
          [
            -35.84232,
            -33.733955
          ],
          [
            -8.433488,
            -23.192091
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/LeftClaw:rotation",
        "interpolation": 2,
        "times": [
          0,
          0.3,
          1
        ],
        "values": [
          -1.4669008,
          -2.1930246,
          -1.4669008
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/RightClaw:position",
        "interpolation": 2,
        "times": [
          0,
          0.3,
          1
        ],
        "values": [
          [
            -4.216744,
            21.08372
          ],
          [
            -2.8750525,
            29.282948
          ],
          [
            -4.216744,
            21.08372
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/RightClaw:rotation",
        "interpolation": 2,
        "times": [
          0,
          0.3,
          1
        ],
        "values": [
          -0.8106927,
          -0.649385,
          -0.8106927
        ]
      }
    ]
  },
  "wobble": {
    "duration": 1,
    "tracks": [
      {
        "path": "Visuals/visuals2/Sprite2D:scale",
        "interpolation": 2,
        "times": [
          0,
          0.25,
          0.5,
          0.75,
          1
        ],
        "values": [
          [
            1,
            1
          ],
          [
            1.1,
            0.9
          ],
          [
            0.9,
            1.1
          ],
          [
            1.1,
            0.9
          ],
          [
            1,
            1
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D:rotation",
        "interpolation": 1,
        "times": [
          0,
          0.24870972,
          0.7492774,
          1
        ],
        "values": [
          0,
          0.17453292519943295,
          -0.17453292519943295,
          0
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/LeftClaw:position",
        "interpolation": 2,
        "times": [
          0,
          0.5,
          1
        ],
        "values": [
          [
            -1.4285698,
            0
          ],
          [
            21.846485,
            9.8204155
          ],
          [
            -1.4285698,
            0
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/RightClaw:position",
        "interpolation": 2,
        "times": [
          0,
          0.5,
          1
        ],
        "values": [
          [
            -1.4285698,
            0
          ],
          [
            -24.865213,
            1.3016963
          ],
          [
            -1.4285698,
            0
          ]
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/LeftClaw:rotation",
        "interpolation": 1,
        "times": [
          0
        ],
        "values": [
          0
        ]
      },
      {
        "path": "Visuals/visuals2/Sprite2D/RightClaw:rotation",
        "interpolation": 1,
        "times": [
          0
        ],
        "values": [
          0
        ]
      }
    ]
  }
};
