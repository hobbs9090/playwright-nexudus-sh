@bdd @mp @bookings @mode:serial
Feature: MP member bookings
  As a member
  I want to create bookings with different dates, durations, recurrences, and alternative-slot rules
  So that booking behavior can be verified from a single scenario outline

  Scenario Outline: member "<Member Name>" books "<Resource name>" on "<Date>" at "<Start time>" for "<Length>" with repeat "<Repeat options>" and alternative "<Alternative>"
    Given member "<Member Name>" can access the member portal
    When they create a booking for "<Resource name>" on "<Date>" at "<Start time>" for "<Length>" with repeat "<Repeat options>" and alternative "<Alternative>"
    Then the booking should be confirmed with the expected booking details

    Examples:
      | Member Name | Resource name         | Date         | Start time | Length     | Repeat options      | Alternative |
      | John Younger | Large Meeting Room #1 | next Tuesday | 9am        | 30 minutes | Does not repeat     | true        |
      | John Younger | Large Meeting Room #1 | tomorrow     | 7pm        | 30 minutes | Does not repeat     | true       |
      | John Younger | Large Meeting Room #1 | next Wednesday | 7pm      | 30 minutes | Every workday       | true       |
      | John Younger | Large Meeting Room #1 | 23/03/2026   | 7:30pm     | 30 minutes | Every day on Monday | true       |
