@bdd @ap @resources @utility @mode:serial
Feature: Meeting room seed utility
  As a tester
  I want to seed meeting-room style resources through the Nexudus API
  So that I can prepare realistic manual-test data quickly

  Background:
    Given the resource seed utility configuration is ready

  Scenario Outline: resource seed utility creates <Count> "<Resource type>" resources with theme "<Theme>", base "<Base>", and seed "<Seed>"
    When they prepare a resource seed utility request
    And resource seed resource type is "<Resource type>"
    And resource seed count is "<Count>"
    And resource seed theme is "<Theme>"
    And resource seed base is "<Base>"
    And resource seed uses preferred seed is "<Seed>"
    And resource seed visible is "<Visible>"
    And resource seed requires confirmation is "<Requires confirmation>"
    And resource seed allocation is "<Allocation>"
    And resource seed minimum booking length is "<Min booking length>"
    And resource seed maximum booking length is "<Max booking length>"
    And resource seed allow multiple bookings is "<Allow multiple bookings>"
    And resource seed hide in calendar is "<Hide in calendar>"
    And resource seed only for members is "<Only for members>"
    And resource seed amenities are "<Amenities>"
    And they run the resource seed utility
    Then the resource seed utility should finish successfully

    Examples:
      | Resource type         | Count | Theme                 | Base | Seed | Visible | Requires confirmation | Allocation | Min booking length | Max booking length | Allow multiple bookings | Hide in calendar | Only for members | Amenities                                           |
      | Large Meeting Room #1 | 5     | harry potter villains | Room | true | true    | false                 | 8          | 30                 | 120                | false                   | false            | true             | Internet, WhiteBoard, LargeDisplay, AirConditioning |
