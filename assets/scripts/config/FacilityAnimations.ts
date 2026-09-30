// Numeric keyframes extracted from original Godot scenes.
export const FACILITY_ANIMATIONS = {
  "kitchen": {
    "woob": {
      "duration": 0.6,
      "loop": false,
      "tracks": [
        {
          "path": "Cauldron:scale",
          "interpolation": 1,
          "times": [
            0,
            0.2,
            0.4,
            0.6
          ],
          "transitions": [
            0.5,
            -2,
            1,
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
        }
      ]
    },
    "Wobble": {
      "duration": 2,
      "loop": true,
      "tracks": [
        {
          "path": ".:scale",
          "interpolation": 2,
          "times": [
            0,
            1,
            2
          ],
          "transitions": [
            1,
            1,
            1
          ],
          "values": [
            [
              0.9,
              1.1
            ],
            [
              1.1,
              0.9
            ],
            [
              0.9,
              1.1
            ]
          ]
        },
        {
          "path": "%Chef2:scale",
          "interpolation": 2,
          "times": [
            0,
            1,
            2
          ],
          "transitions": [
            1,
            1,
            1
          ],
          "values": [
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
            ]
          ]
        },
        {
          "path": "%Chef3:scale",
          "interpolation": 2,
          "times": [
            0,
            1,
            2
          ],
          "transitions": [
            1,
            1,
            1
          ],
          "values": [
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
            ]
          ]
        }
      ]
    }
  },
  "boat": {
    "rock": {
      "duration": 4,
      "loop": true,
      "tracks": [
        {
          "path": ".:rotation",
          "interpolation": 2,
          "times": [
            0,
            1,
            2,
            3
          ],
          "transitions": [
            1,
            1,
            1,
            1
          ],
          "values": [
            0,
            -0.08726646259971647,
            0,
            0.08726646259971647
          ]
        },
        {
          "path": "%Sprite2D/../Line:rotation",
          "interpolation": 2,
          "times": [
            0,
            1,
            2,
            3
          ],
          "transitions": [
            1,
            1,
            1,
            1
          ],
          "values": [
            0,
            -0.08430569,
            0,
            0.07397906
          ]
        }
      ]
    }
  },
  "tunnel": {
    "Loop": {
      "duration": 1,
      "loop": true,
      "tracks": [
        {
          "path": ".:scale",
          "interpolation": 2,
          "times": [
            0,
            0.2,
            0.6,
            1
          ],
          "transitions": [
            1,
            1,
            1,
            1
          ],
          "values": [
            [
              1,
              1
            ],
            [
              1.1,
              1
            ],
            [
              0.9,
              1
            ],
            [
              1,
              1
            ]
          ]
        },
        {
          "path": "%Tunneller2:position",
          "interpolation": 2,
          "times": [
            0,
            0.2,
            0.6
          ],
          "transitions": [
            1,
            1,
            1
          ],
          "values": [
            [
              5,
              156
            ],
            [
              5.454545,
              152
            ],
            [
              5,
              156
            ]
          ]
        }
      ]
    }
  },
  "mycologist": {
    "wobble": {
      "duration": 1.6,
      "loop": true,
      "tracks": [
        {
          "path": "Visuals/Sprite2D:position",
          "interpolation": 1,
          "times": [
            0,
            0.4,
            0.8,
            1.2,
            1.6
          ],
          "transitions": [
            1,
            1,
            1,
            1,
            1
          ],
          "values": [
            [
              0,
              -30
            ],
            [
              0,
              -26
            ],
            [
              0,
              -30
            ],
            [
              0,
              -26
            ],
            [
              0,
              -30
            ]
          ]
        },
        {
          "path": "Visuals/Sprite2D:rotation",
          "interpolation": 1,
          "times": [
            0,
            0.4,
            0.8,
            1.2,
            1.6
          ],
          "transitions": [
            1,
            1,
            1,
            1,
            1
          ],
          "values": [
            0,
            0.10471975511965978,
            0,
            -0.06981317007977318,
            0
          ]
        },
        {
          "path": "Visuals/Sprite2D:scale",
          "interpolation": 1,
          "times": [
            0,
            0.4,
            0.8,
            1.2,
            1.6
          ],
          "transitions": [
            1,
            1,
            1,
            1,
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
        }
      ]
    }
  }
};
