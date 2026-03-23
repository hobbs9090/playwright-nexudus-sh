@bdd @mp @authenticated
Feature: MP member login
  As a configured member
  I want to sign in to the member portal
  So that I can reach my dashboard

  Scenario: configured member login reaches dashboard
    Given I am on the member portal login page
    When I sign in with the configured member credentials
    Then I should reach the authenticated member dashboard
