// Extracted from original .tscn and .tres files. Run tools/import-presentation.cjs to audit.
export const PRESENTATION = {
  "princess": {
    "animations": {
      "RESET": {
        "duration": 0.001,
        "loop": false,
        "tracks": [
          {
            "path": "Visuals/Sprite2D:position",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              [
                0,
                -30
              ]
            ]
          },
          {
            "path": "Visuals/Sprite2D:scale",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              [
                1,
                1
              ]
            ]
          },
          {
            "path": "Visuals/Sprite2D:rotation",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              0
            ]
          }
        ]
      },
      "wobble_slow": {
        "duration": 3,
        "loop": true,
        "tracks": [
          {
            "path": "Visuals/Sprite2D:scale",
            "interpolation": 1,
            "times": [
              0,
              0.75,
              1.5,
              2.25
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
                1,
                0.7
              ],
              [
                1,
                1
              ],
              [
                1,
                0.7
              ]
            ]
          },
          {
            "path": "Visuals/Sprite2D:rotation",
            "interpolation": 1,
            "times": [
              0,
              0.75,
              2.25
            ],
            "transitions": [
              1,
              1,
              1
            ],
            "values": [
              0,
              0.06981317007977318,
              -0.06981317007977318
            ]
          },
          {
            "path": "Visuals/Sprite2D:position",
            "interpolation": 1,
            "times": [
              0,
              0.75,
              1.5,
              2.25
            ],
            "transitions": [
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
                -25
              ],
              [
                0,
                -30
              ],
              [
                0,
                -25
              ]
            ]
          }
        ]
      }
    },
    "nodes": [
      {
        "name": "Princess",
        "parent": null,
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "Visuals",
        "parent": ".",
        "position": [
          0,
          14
        ],
        "scale": [
          0.75,
          0.75
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "Sprite2D",
        "parent": "Visuals",
        "position": [
          0,
          -30
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "queen_lvl_0"
      },
      {
        "name": "Shadow",
        "parent": "Visuals",
        "position": [
          -2.842171e-14,
          -7.9166675
        ],
        "scale": [
          0.7559374,
          0.22583334
        ],
        "rotation": 0,
        "color": [
          0,
          0,
          0,
          0.09803922
        ],
        "visible": true,
        "texture": "circle"
      }
    ],
    "particles": []
  },
  "farmer": {
    "animations": {
      "RESET": {
        "duration": 0.001,
        "loop": false,
        "tracks": [
          {
            "path": "Visuals/Sprite2D:position",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              [
                0,
                -35
              ]
            ]
          },
          {
            "path": "Visuals/Sprite2D:scale",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              [
                1,
                1
              ]
            ]
          },
          {
            "path": "Visuals/Sprite2D:rotation",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              0
            ]
          }
        ]
      },
      "wobble": {
        "duration": 2,
        "loop": true,
        "tracks": [
          {
            "path": "Visuals/Sprite2D:position",
            "interpolation": 1,
            "times": [
              0,
              0.5,
              1,
              1.5,
              2
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
                -35
              ],
              [
                0,
                -25
              ],
              [
                0,
                -35
              ],
              [
                0,
                -25
              ],
              [
                0,
                -35
              ]
            ]
          },
          {
            "path": "Visuals/Sprite2D:rotation",
            "interpolation": 1,
            "times": [
              0,
              0.5,
              1,
              1.5,
              2
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
              0.13962634015954636,
              0,
              -0.13962634015954636,
              0
            ]
          },
          {
            "path": "Visuals/Sprite2D:scale",
            "interpolation": 1,
            "times": [
              0,
              0.5,
              1,
              1.5,
              2
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
                1.2,
                0.7
              ],
              [
                1,
                1
              ],
              [
                1.2,
                0.7
              ],
              [
                1,
                1
              ]
            ]
          }
        ]
      }
    },
    "nodes": [
      {
        "name": "Farmer",
        "parent": null,
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "Visuals",
        "parent": ".",
        "position": [
          0,
          -10
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "Sprite2D",
        "parent": "Visuals",
        "position": [
          0,
          -35
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "units/farmer"
      },
      {
        "name": "Shadow",
        "parent": "Visuals",
        "position": [
          0,
          12
        ],
        "scale": [
          0.39052,
          0.14112549
        ],
        "rotation": 0,
        "color": [
          0,
          0,
          0,
          0.09803922
        ],
        "visible": true,
        "texture": "circle"
      }
    ],
    "particles": []
  },
  "aphid": {
    "animations": {
      "RESET": {
        "duration": 0.001,
        "loop": false,
        "tracks": [
          {
            "path": "%Visuals/..:scale",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              [
                1,
                1
              ]
            ]
          }
        ]
      },
      "shine": {
        "duration": 10,
        "loop": true,
        "tracks": [
          {
            "path": ".:material:shader_parameter/hue_shift",
            "interpolation": 1,
            "times": [
              0,
              10
            ],
            "transitions": [
              1,
              1
            ],
            "values": [
              1,
              0
            ]
          }
        ]
      },
      "flatten": {
        "duration": 0.1,
        "loop": false,
        "tracks": [
          {
            "path": "SurVisuals/Visuals/Sprite2D:scale",
            "interpolation": 2,
            "times": [
              0,
              0.1
            ],
            "transitions": [
              0.5,
              1
            ],
            "values": [
              [
                1,
                1
              ],
              [
                1.2,
                0.4
              ]
            ]
          },
          {
            "path": "SurVisuals/Visuals/Sprite2D:position",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              0.5
            ],
            "values": [
              [
                0,
                2
              ]
            ]
          },
          {
            "path": "SurVisuals/Visuals/Sprite2D:rotation",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              0
            ]
          }
        ]
      },
      "inflate": {
        "duration": 2.5,
        "loop": false,
        "tracks": [
          {
            "path": "SurVisuals/Visuals/Sprite2D:scale",
            "interpolation": 2,
            "times": [
              0,
              2.5
            ],
            "transitions": [
              2,
              1
            ],
            "values": [
              [
                1.2,
                0.4
              ],
              [
                1,
                1
              ]
            ]
          },
          {
            "path": "SurVisuals/Visuals/Sprite2D:rotation",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              0
            ]
          },
          {
            "path": "SurVisuals/Visuals/Sprite2D:position",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              [
                0,
                0
              ]
            ]
          }
        ]
      },
      "wobble": {
        "duration": 1.5,
        "loop": true,
        "tracks": [
          {
            "path": "SurVisuals/Visuals/Sprite2D:scale",
            "interpolation": 2,
            "times": [
              0,
              0.4,
              0.8,
              1.1
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
                1.2,
                0.8
              ],
              [
                1,
                1
              ],
              [
                1.2,
                0.8
              ]
            ]
          },
          {
            "path": "SurVisuals/Visuals/Sprite2D:rotation",
            "interpolation": 2,
            "times": [
              0,
              0.4,
              1.1
            ],
            "transitions": [
              1,
              1,
              1
            ],
            "values": [
              0,
              0.08726646259971647,
              -0.08726646259971647
            ]
          },
          {
            "path": "SurVisuals/Visuals/Sprite2D:position",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              [
                0,
                2
              ]
            ]
          }
        ]
      },
      "pet": {
        "duration": 0.6,
        "loop": false,
        "tracks": [
          {
            "path": "%Visuals/..:scale",
            "interpolation": 2,
            "times": [
              0,
              0.099999994,
              0.4,
              0.6
            ],
            "transitions": [
              0.5,
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
                1.2,
                0.4
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
      }
    },
    "nodes": [
      {
        "name": "Aphid",
        "parent": null,
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "SurVisuals",
        "parent": ".",
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "Visuals",
        "parent": "SurVisuals",
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "Sprite2D",
        "parent": "SurVisuals/Visuals",
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "units/aphid_honey"
      },
      {
        "name": "Shadow",
        "parent": ".",
        "position": [
          3.0092655e-36,
          -2
        ],
        "scale": [
          0.33812496,
          0.10353729
        ],
        "rotation": 0,
        "color": [
          0,
          0,
          0,
          0.09803922
        ],
        "visible": true,
        "texture": "circle"
      }
    ],
    "particles": [
      {
        "name": "Pluck",
        "position": [
          -25,
          -22
        ],
        "color": [
          1,
          1,
          1,
          1
        ],
        "texture": "dot2",
        "amount": 3,
        "lifetime": 0.7,
        "speed": 2,
        "explosiveness": 0.9,
        "randomness": 0.6,
        "oneShot": true,
        "lifeRandom": 0.1,
        "box": [
          0,
          0,
          0
        ],
        "spread": 40,
        "direction": [
          0,
          -1,
          0
        ],
        "velocity": [
          200,
          400
        ],
        "gravity": [
          0,
          800,
          0
        ],
        "scale": [
          1,
          2.5
        ],
        "angle": [
          0.000010728835,
          360.00003
        ],
        "damping": [
          0,
          0
        ],
        "hue": [
          -0.020000022,
          0.019999977
        ],
        "gradient": [
          [
            0.80786026,
            1,
            1,
            1,
            1
          ],
          [
            1,
            1,
            1,
            1,
            0
          ]
        ],
        "alphaCurve": [],
        "scaleCurve": [],
        "sphere": 10,
        "fadeStart": 0.80786026
      }
    ]
  },
  "tunnel": {
    "animations": {
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
      },
      "RESET": {
        "duration": 0.001,
        "loop": false,
        "tracks": [
          {
            "path": ".:scale",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              [
                1,
                1
              ]
            ]
          }
        ]
      }
    },
    "nodes": [
      {
        "name": "SpriteTunnel",
        "parent": null,
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": false,
        "texture": null
      },
      {
        "name": "Hint",
        "parent": ".",
        "position": [
          0,
          13
        ],
        "scale": [
          0.9,
          0.2
        ],
        "rotation": 0,
        "color": [
          0.1818133,
          0.07457376,
          0.000028950646,
          1
        ],
        "visible": true,
        "texture": "tunnel_bottom"
      },
      {
        "name": "TunnelTop",
        "parent": ".",
        "position": [
          0,
          -59.5
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": false,
        "texture": "tunnel_top"
      },
      {
        "name": "Tunneller",
        "parent": ".",
        "position": [
          -2,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "units/Tunneller1"
      },
      {
        "name": "Tunneller3",
        "parent": "Tunneller",
        "position": [
          5,
          169
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "units/Tunneller3"
      },
      {
        "name": "Tunneller2",
        "parent": "Tunneller",
        "position": [
          5,
          156
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "units/Tunneller2"
      },
      {
        "name": "TunnelBottom",
        "parent": ".",
        "position": [
          0,
          -60.5
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": false,
        "texture": "tunnel_bottom"
      }
    ],
    "particles": [
      {
        "name": "Dirt",
        "position": [
          0,
          -5
        ],
        "color": [
          0.47876966,
          0.28955293,
          0.11337624,
          1
        ],
        "texture": "dot2",
        "amount": 20,
        "lifetime": 0.8,
        "speed": 1.5,
        "explosiveness": 0,
        "randomness": 0.5,
        "oneShot": false,
        "lifeRandom": 0,
        "box": [
          40,
          5,
          1
        ],
        "spread": 50,
        "direction": [
          0,
          -1,
          0
        ],
        "velocity": [
          100,
          200
        ],
        "gravity": [
          0,
          200,
          0
        ],
        "scale": [
          1,
          2.5
        ],
        "angle": [
          0,
          0
        ],
        "damping": [
          10,
          30.000002
        ],
        "hue": [
          -0.010000022,
          0.009999977
        ],
        "gradient": [
          [
            0,
            1,
            1,
            1,
            1
          ],
          [
            0.5627907,
            0.9116279,
            0.9116279,
            0.9116279,
            1
          ],
          [
            1,
            0.45840496,
            0.45840508,
            0.4584049,
            1
          ]
        ],
        "alphaCurve": [],
        "scaleCurve": [
          [
            0,
            1,
            0,
            0,
            0,
            0
          ],
          [
            0.49792528,
            1,
            0,
            0,
            0,
            0
          ],
          [
            1,
            0,
            0,
            0,
            0,
            0
          ]
        ],
        "sphere": 0,
        "fadeStart": 0.80786026
      },
      {
        "name": "Pop",
        "position": [
          0,
          -4
        ],
        "color": [
          0.69803923,
          0.34509805,
          0.23529412,
          1
        ],
        "texture": "dot2",
        "amount": 50,
        "lifetime": 2,
        "speed": 3,
        "explosiveness": 0.9,
        "randomness": 0.6,
        "oneShot": true,
        "lifeRandom": 0,
        "box": [
          0,
          0,
          0
        ],
        "spread": 30,
        "direction": [
          0,
          -1,
          0
        ],
        "velocity": [
          250,
          400
        ],
        "gravity": [
          0,
          350,
          0
        ],
        "scale": [
          0.5,
          2.5
        ],
        "angle": [
          0,
          0
        ],
        "damping": [
          10,
          30.000002
        ],
        "hue": [
          -0.04000002,
          0.039999977
        ],
        "gradient": [
          [
            0,
            1,
            1,
            1,
            1
          ],
          [
            0.5627907,
            0.9116279,
            0.9116279,
            0.9116279,
            1
          ],
          [
            1,
            0.45840496,
            0.45840508,
            0.4584049,
            1
          ]
        ],
        "alphaCurve": [],
        "scaleCurve": [
          [
            0,
            1,
            0,
            0,
            0,
            0
          ],
          [
            0.49792528,
            1,
            0,
            0,
            0,
            0
          ],
          [
            1,
            0,
            0,
            0,
            0,
            0
          ]
        ],
        "sphere": 20,
        "fadeStart": 0.80786026
      }
    ]
  },
  "kitchen": {
    "animations": {
      "RESET": {
        "duration": 0.001,
        "loop": false,
        "tracks": [
          {
            "path": ".:scale",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              [
                1,
                1
              ]
            ]
          },
          {
            "path": "%Chef2:scale",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              [
                1.1,
                0.9
              ]
            ]
          },
          {
            "path": "%Chef3:scale",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              [
                1.1,
                0.9
              ]
            ]
          }
        ]
      },
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
    "nodes": [
      {
        "name": "BuildingCuisine",
        "parent": null,
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "platform",
        "parent": ".",
        "position": [
          -57,
          -125
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "buildings/Chair"
      },
      {
        "name": "Carpet",
        "parent": ".",
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "buildings/Carpet"
      },
      {
        "name": "Cauldron",
        "parent": ".",
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "buildings/Cauldron"
      },
      {
        "name": "SubCuisinePomme",
        "parent": ".",
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "SubCuisineBrochette",
        "parent": ".",
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "SubCuisineGlace",
        "parent": ".",
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "SubCuisineScarlet",
        "parent": ".",
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "Chef1",
        "parent": ".",
        "position": [
          -56,
          -178
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "units/chef_idle"
      },
      {
        "name": "Chef2",
        "parent": ".",
        "position": [
          104,
          -7
        ],
        "scale": [
          1.1,
          0.9
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "units/chef_idle"
      },
      {
        "name": "Chef3",
        "parent": ".",
        "position": [
          -61,
          24.000008
        ],
        "scale": [
          1.1,
          0.9
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "units/chef_idle"
      }
    ],
    "particles": [
      {
        "name": "Pluck",
        "position": [
          -3,
          -130
        ],
        "color": [
          1,
          1,
          1,
          1
        ],
        "texture": "dot2",
        "amount": 12,
        "lifetime": 1,
        "speed": 2,
        "explosiveness": 0.9,
        "randomness": 0.2,
        "oneShot": true,
        "lifeRandom": 0.3,
        "box": [
          0,
          0,
          0
        ],
        "spread": 35,
        "direction": [
          0,
          -1,
          0
        ],
        "velocity": [
          200,
          500
        ],
        "gravity": [
          0,
          800,
          0
        ],
        "scale": [
          1.5,
          3
        ],
        "angle": [
          0.000010728835,
          360.00003
        ],
        "damping": [
          0,
          0
        ],
        "hue": [
          -0.020000022,
          0.019999977
        ],
        "gradient": [
          [
            0.80786026,
            1,
            1,
            1,
            1
          ],
          [
            1,
            1,
            1,
            1,
            0
          ]
        ],
        "alphaCurve": [],
        "scaleCurve": [],
        "sphere": 0,
        "fadeStart": 0.80786026
      }
    ]
  },
  "mushrooms": {
    "animations": {
      "RESET": {
        "duration": 0.001,
        "loop": false,
        "tracks": [
          {
            "path": "Sprite2D:scale",
            "interpolation": 1,
            "times": [
              0
            ],
            "transitions": [
              1
            ],
            "values": [
              [
                1,
                1
              ]
            ]
          }
        ]
      },
      "woob": {
        "duration": 0.6,
        "loop": false,
        "tracks": [
          {
            "path": "Sprite2D:scale",
            "interpolation": 1,
            "times": [
              0,
              0.2,
              0.4,
              0.55
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
      }
    },
    "nodes": [
      {
        "name": "BuildingMushrooms",
        "parent": null,
        "position": [
          0,
          0
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": null
      },
      {
        "name": "Sprite2D",
        "parent": ".",
        "position": [
          0,
          10
        ],
        "scale": [
          1,
          1
        ],
        "rotation": 0,
        "color": [
          1,
          1,
          1,
          1
        ],
        "visible": true,
        "texture": "buildings/Lab"
      },
      {
        "name": "Shadow",
        "parent": ".",
        "position": [
          0,
          0.0000019073486
        ],
        "scale": [
          0.69375,
          0.2986589
        ],
        "rotation": 0,
        "color": [
          0,
          0,
          0,
          0.09803922
        ],
        "visible": false,
        "texture": "circle"
      }
    ],
    "particles": [
      {
        "name": "GPUParticlesBrown",
        "position": [
          -59,
          -214
        ],
        "color": [
          0.8235294,
          0.6745098,
          0.6117647,
          1
        ],
        "texture": "circle",
        "amount": 120,
        "lifetime": 15,
        "speed": 1,
        "explosiveness": 0,
        "randomness": 0.1,
        "oneShot": false,
        "lifeRandom": 0.2,
        "box": [
          15,
          5,
          1
        ],
        "spread": 20,
        "direction": [
          0,
          -1,
          0
        ],
        "velocity": [
          30,
          40
        ],
        "gravity": [
          0,
          0,
          0
        ],
        "scale": [
          0.19999999,
          0.39999998
        ],
        "angle": [
          0,
          0
        ],
        "damping": [
          0.010000001,
          0.05
        ],
        "hue": [
          -0.010000022,
          0.009999977
        ],
        "gradient": [],
        "alphaCurve": [
          [
            0,
            0.8,
            0,
            0,
            0,
            0
          ],
          [
            0.5,
            0.8,
            0,
            0,
            0,
            0
          ],
          [
            0.8980393,
            0.20364237,
            0,
            0,
            0,
            0
          ],
          [
            1,
            0,
            0,
            0,
            0,
            0
          ]
        ],
        "scaleCurve": [
          [
            0,
            0.25,
            0,
            0,
            0,
            0
          ],
          [
            1,
            1,
            1.4,
            0,
            0,
            0
          ]
        ],
        "sphere": 0,
        "fadeStart": 0.5
      },
      {
        "name": "GPUParticlesGreen",
        "position": [
          -59,
          -214
        ],
        "color": [
          0.5411765,
          0.83137256,
          0.43137255,
          1
        ],
        "texture": "circle",
        "amount": 90,
        "lifetime": 10,
        "speed": 1,
        "explosiveness": 0.5,
        "randomness": 0.1,
        "oneShot": false,
        "lifeRandom": 0.2,
        "box": [
          15,
          5,
          1
        ],
        "spread": 25,
        "direction": [
          0,
          -1,
          0
        ],
        "velocity": [
          30,
          40
        ],
        "gravity": [
          0,
          0,
          0
        ],
        "scale": [
          0.099999994,
          0.29999998
        ],
        "angle": [
          0,
          0
        ],
        "damping": [
          0.2,
          0.3
        ],
        "hue": [
          -0.020000022,
          0.019999977
        ],
        "gradient": [],
        "alphaCurve": [
          [
            0,
            0.8,
            0,
            0,
            0,
            0
          ],
          [
            0.5,
            0.8,
            0,
            0,
            0,
            0
          ],
          [
            0.8980393,
            0.20364237,
            0,
            0,
            0,
            0
          ],
          [
            1,
            0,
            0,
            0,
            0,
            0
          ]
        ],
        "scaleCurve": [
          [
            0,
            0.25,
            0,
            0,
            0,
            0
          ],
          [
            1,
            1,
            1.4,
            0,
            0,
            0
          ]
        ],
        "sphere": 0,
        "fadeStart": 0.5
      },
      {
        "name": "GPUParticlesBlue",
        "position": [
          -59,
          -214
        ],
        "color": [
          0.3647059,
          0.54901963,
          0.8392157,
          1
        ],
        "texture": "circle",
        "amount": 90,
        "lifetime": 10,
        "speed": 1,
        "explosiveness": 0.5,
        "randomness": 0.1,
        "oneShot": false,
        "lifeRandom": 0.2,
        "box": [
          15,
          5,
          1
        ],
        "spread": 25,
        "direction": [
          0,
          -1,
          0
        ],
        "velocity": [
          30,
          40
        ],
        "gravity": [
          0,
          0,
          0
        ],
        "scale": [
          0.099999994,
          0.29999998
        ],
        "angle": [
          0,
          0
        ],
        "damping": [
          0.2,
          0.3
        ],
        "hue": [
          -0.020000022,
          0.019999977
        ],
        "gradient": [],
        "alphaCurve": [
          [
            0,
            0.8,
            0,
            0,
            0,
            0
          ],
          [
            0.5,
            0.8,
            0,
            0,
            0,
            0
          ],
          [
            0.8980393,
            0.20364237,
            0,
            0,
            0,
            0
          ],
          [
            1,
            0,
            0,
            0,
            0,
            0
          ]
        ],
        "scaleCurve": [
          [
            0,
            0.25,
            0,
            0,
            0,
            0
          ],
          [
            1,
            1,
            1.4,
            0,
            0,
            0
          ]
        ],
        "sphere": 0,
        "fadeStart": 0.5
      },
      {
        "name": "GPUParticlesRed",
        "position": [
          -59,
          -214
        ],
        "color": [
          0.9490196,
          0.34509805,
          0.3137255,
          1
        ],
        "texture": "circle",
        "amount": 90,
        "lifetime": 10,
        "speed": 5,
        "explosiveness": 0.5,
        "randomness": 0.1,
        "oneShot": false,
        "lifeRandom": 0.25,
        "box": [
          15,
          5,
          1
        ],
        "spread": 10,
        "direction": [
          0,
          -1,
          0
        ],
        "velocity": [
          30,
          40
        ],
        "gravity": [
          0,
          0,
          0
        ],
        "scale": [
          0.049999997,
          0.19999999
        ],
        "angle": [
          0,
          0
        ],
        "damping": [
          2,
          3.0000002
        ],
        "hue": [
          -0.020000022,
          0.019999977
        ],
        "gradient": [],
        "alphaCurve": [
          [
            0,
            0.8,
            0,
            0,
            0,
            0
          ],
          [
            0.5,
            0.8,
            0,
            0,
            0,
            0
          ],
          [
            0.8980393,
            0.20364237,
            0,
            0,
            0,
            0
          ],
          [
            1,
            0,
            0,
            0,
            0,
            0
          ]
        ],
        "scaleCurve": [
          [
            0,
            0.25,
            0,
            0,
            0,
            0
          ],
          [
            1,
            1,
            1.4,
            0,
            0,
            0
          ]
        ],
        "sphere": 0,
        "fadeStart": 0.5
      }
    ]
  }
};
export const ORIGINAL_SOUNDS = {
  "building_intro": {
    "streams": [
      "InflateArpeggio.wav"
    ],
    "pitch": [
      1,
      1
    ],
    "volume": 0.8
  },
  "InflateArpeggio": {
    "streams": [
      "InflateArpeggio.wav"
    ],
    "pitch": [
      1,
      1
    ],
    "volume": 0.8
  },
  "bush_click": {
    "streams": [
      "foliage_small.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 1
  },
  "foliage_small": {
    "streams": [
      "foliage_small.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 1
  },
  "bush_discovered": {
    "streams": [
      "bush_discover.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 0.4
  },
  "bush_discover": {
    "streams": [
      "bush_discover.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 0.4
  },
  "chomp": {
    "streams": [
      "chomp_1.wav"
    ],
    "pitch": [
      1,
      1.2000000000000002
    ],
    "volume": 0.2
  },
  "chomp_1": {
    "streams": [
      "chomp_1.wav"
    ],
    "pitch": [
      1,
      1.2000000000000002
    ],
    "volume": 0.2
  },
  "larvae_spawn": {
    "streams": [
      "egg_hatch_1.wav",
      "egg_hatch_2.wav"
    ],
    "pitch": [
      1,
      1
    ],
    "volume": 1
  },
  "egg_hatch_1": {
    "streams": [
      "egg_hatch_1.wav",
      "egg_hatch_2.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 1
  },
  "egg_hatch_2": {
    "streams": [
      "egg_hatch_1.wav",
      "egg_hatch_2.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 1
  },
  "larva_slither": {
    "streams": [
      "larve.mp3"
    ],
    "pitch": [
      0.5,
      1.5
    ],
    "volume": 0.05
  },
  "larve": {
    "streams": [
      "larve.mp3"
    ],
    "pitch": [
      0.5,
      1.5
    ],
    "volume": 0.05
  },
  "level_up": {
    "streams": [
      "QueenLevelsUp2.wav"
    ],
    "pitch": [
      1,
      1
    ],
    "volume": 0.8
  },
  "QueenLevelsUp2": {
    "streams": [
      "QueenLevelsUp2.wav"
    ],
    "pitch": [
      1,
      1
    ],
    "volume": 0.8
  },
  "new_boat": {
    "streams": [
      "Boat.wav"
    ],
    "pitch": [
      1,
      1
    ],
    "volume": 1.1
  },
  "Boat": {
    "streams": [
      "Boat.wav"
    ],
    "pitch": [
      1,
      1
    ],
    "volume": 1.1
  },
  "plink": {
    "streams": [
      "Pearl2.wav"
    ],
    "pitch": [
      0.9,
      1.2000000000000002
    ],
    "volume": 0.15
  },
  "Pearl2": {
    "streams": [
      "Pearl2.wav"
    ],
    "pitch": [
      0.9,
      1.2000000000000002
    ],
    "volume": 0.15
  },
  "resource_get": {
    "streams": [
      "Brain.wav"
    ],
    "pitch": [
      1,
      1
    ],
    "volume": 0.8
  },
  "Brain": {
    "streams": [
      "Brain.wav"
    ],
    "pitch": [
      1,
      1
    ],
    "volume": 0.8
  },
  "set_sail": {
    "streams": [
      "Campana3.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 1
  },
  "Campana3": {
    "streams": [
      "Campana3.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 1
  },
  "squish": {
    "streams": [
      "squish.wav"
    ],
    "pitch": [
      0.7999999999999999,
      1.1
    ],
    "volume": 0.3
  },
  "trap_cock": {
    "streams": [
      "trap_set.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 0.1
  },
  "trap_set": {
    "streams": [
      "trap_set.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 0.1
  },
  "trap_trigger": {
    "streams": [
      "trap_trigger.wav"
    ],
    "pitch": [
      0.9,
      1
    ],
    "volume": 0.1
  },
  "ui_hover": {
    "streams": [
      "FDQ_SD1.wav"
    ],
    "pitch": [
      0.7999999999999999,
      1.2000000000000002
    ],
    "volume": 0.8
  },
  "FDQ_SD1": {
    "streams": [
      "FDQ_SD1.wav"
    ],
    "pitch": [
      0.7999999999999999,
      1.2000000000000002
    ],
    "volume": 0.8
  },
  "ui_option_toggle": {
    "streams": [
      "button_click.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 0.5
  },
  "button_click": {
    "streams": [
      "button_click.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 0.5
  },
  "ui_purchase_failure": {
    "streams": [
      "FDQ_SD7.wav"
    ],
    "pitch": [
      0.7,
      0.7999999999999999
    ],
    "volume": 1
  },
  "FDQ_SD7": {
    "streams": [
      "FDQ_SD7.wav"
    ],
    "pitch": [
      0.7,
      0.7999999999999999
    ],
    "volume": 1
  },
  "ui_purchase_success": {
    "streams": [
      "FDQ_SD5.wav"
    ],
    "pitch": [
      1,
      1.2000000000000002
    ],
    "volume": 1
  },
  "FDQ_SD5": {
    "streams": [
      "FDQ_SD5.wav"
    ],
    "pitch": [
      1,
      1.2000000000000002
    ],
    "volume": 1
  },
  "worker_hatch": {
    "streams": [
      "egg_hatch_1.wav",
      "egg_hatch_2.wav"
    ],
    "pitch": [
      0.9,
      1.1
    ],
    "volume": 1
  }
};
