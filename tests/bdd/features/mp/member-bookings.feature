@bdd @mp @bookings @utility @mode:serial
Feature: MP booking utility
  As a tester
  I want to add or delete MP booking data from example rows
  So that I can prepare or remove manual test data quickly

  Background:
    Given the MP booking utility action is configured

  Scenario Outline: utility manages "<Resource name>" for "<Member Name>" on "<Date>" at "<Start time>" with "<Repeat options>" and alternative "<Alternative>"
    Given member "<Member Name>" can access the member portal
    When they prepare a booking utility request for "<Resource name>"
    And the requested date is "<Date>"
    And the requested start time is "<Start time>"
    And the requested length is "<Length>"
    And the requested repeat option is "<Repeat options>"
    And alternative booking is "<Alternative>"
    And they run the MP booking utility
    Then the booking utility should finish successfully

    Examples:
      | Member Name | Resource name         | Date           | Start time | Length     | Repeat options       | Alternative |
      | Bob Younger | Large Meeting Room #1 | next Tuesday   | 9am        | 30 minutes | Does not repeat      | true        |
      | Bob Younger | Large Meeting Room #1 | tomorrow       | 7pm        | 30 minutes | Does not repeat      | false       |
      | Bob Younger | Large Meeting Room #1 | next Wednesday | 7pm        | 30 minutes | Every workday        | false       |
      | Bob Younger | Large Meeting Room #1 | 23/03/2026     | 7:30pm     | 30 minutes | Every day on Monday  | false       |
