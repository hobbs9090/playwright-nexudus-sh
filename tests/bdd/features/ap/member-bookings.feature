@bdd @ap @bookings @utility @mode:serial
Feature: AP booking utility
  As a tester
  I want to add or delete booking data through the AP bookings UI
  So that I can prepare or remove manual test data quickly

  Background:
    Given the booking utility configuration is ready

  Scenario Outline: AP utility manages "<Resource name>" for "<Member Name>" on "<Date>" at "<Start time>" with "<Repeat options>" and alternative "<Alternative>"
    Given member "<Member Name>" can access the member portal
    And the booking utility mode is "ap"
    When they prepare a booking utility request for "<Resource name>"
    And the requested date is "<Date>"
    And the requested start time is "<Start time>"
    And the requested length is "<Length>"
    And the requested repeat option is "<Repeat options>"
    And alternative booking is "<Alternative>"
    And they run the browser booking utility
    Then the booking utility should finish successfully

    Examples:
      | Member Name | Resource name | Date     | Start time | Length | Repeat options  | Alternative |
      | Bob Younger | Art Studio    | tomorrow | 10pm       | 1 hour | Does not repeat | true        |
