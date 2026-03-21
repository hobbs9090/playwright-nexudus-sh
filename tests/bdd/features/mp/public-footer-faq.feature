@bdd @mp @public
Feature: MP public footer FAQ
  As an anonymous visitor
  I want the public footer FAQ link to reach the FAQ landing page
  So that I can browse help content before signing in

  Scenario: public footer FAQ reaches FAQ page
    Given I am on the public member portal home page
    When I open the FAQ link from the public footer
    Then I should reach the public FAQ landing page
