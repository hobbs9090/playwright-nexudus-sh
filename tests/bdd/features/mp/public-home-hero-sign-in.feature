@bdd @mp @public
Feature: MP public home hero sign in
  As an anonymous visitor
  I want the hero sign-in link to reach the login form
  So that I can start signing into the member portal

  Scenario: public home hero sign-in reaches login
    Given I am on the public member portal home page
    When I open the hero sign-in link
    Then I should reach the anonymous login page
