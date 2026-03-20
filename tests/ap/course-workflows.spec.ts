import { resolve } from 'node:path'
import { expect, request as playwrightRequest, test } from '@playwright/test'
import { buildCrudName } from '../../helpers'
import { NexudusApiClient, NexudusCoworkerResponse } from '../../api/NexudusApiClient'
import { getConfiguredApiBaseURL } from '../../nexudus-config'
import { APLoginPage } from '../../page-objects/ap/APLoginPage'
import { CoursePage } from '../../page-objects/ap/CoursePage'

type CourseLessonPlan = {
  content: string
  summary: string
  title: string
}

type CourseSectionPlan = {
  lessons: CourseLessonPlan[]
  summary: string
  title: string
}

const courseBaseTitle =
  'Six million four hundred and fifty-three thousand five hundred and sixty-eight Hundreds and Thousands: A History of Cake Decorations'
const courseCategory = 'Cake Decoration History'
const courseSummary =
  'A guided history of cake decoration that moves from formal overpiping to expressive finishing styles, showing how sugar craft evolved across eras and occasions.'
const courseFullDescription = [
  'This course follows cake decoration from stately Victorian ornament to contemporary texture-led finishing. Each lesson explains how a major style emerged, what materials made it possible, and how decorators adapted it for changing tastes, celebrations, and skill levels.',
  'Learners move through core historical techniques in sequence, comparing how Lambeth precision, buttercream softness, royal icing architecture, fondant modelling, wafer paper floristry, and palette-knife finishes each shaped the look of celebratory cakes. The course closes by linking the styles together into a practical visual timeline.',
].join('\n\n')
const courseOverviewHtml = [
  '<p>This public course introduces the major decorative languages that transformed celebration cakes from formal centrepieces into expressive works of craft.</p>',
  '<p>Across three sections, learners will study foundational influences, hands-on techniques, and finishing decisions that help each decorating style communicate mood, occasion, and period detail.</p>',
].join('')
const largeCourseImagePath = resolve(__dirname, '..', 'fixtures', 'ap-course-cake-decorations-large.png')
const smallCourseImagePath = resolve(__dirname, '..', 'fixtures', 'ap-course-cake-decorations-small.png')

const cakeDecoratingCoursePlan: CourseSectionPlan[] = [
  {
    title: 'Foundations',
    summary: 'Sets the historical frame for decorative cakes and introduces two styles that established the language of formal celebration work.',
    lessons: [
      {
        title: 'Introduction',
        summary: 'Frames the course timeline, key materials, and the social history behind decorated celebration cakes.',
        content: buildLessonContent([
          'This opening lesson explains why decorated cakes became such visible symbols of hospitality, status, and celebration.',
          'It also introduces the shared materials that appear throughout the course, including royal icing, buttercream, fondant, wafer paper, and palette-knife finishes.',
        ]),
      },
      {
        title: 'Lambeth Overpiping',
        summary: 'Explores the elaborate piped scrollwork and pressure piping that defined formal British celebration cakes.',
        content: buildLessonContent([
          'Lambeth overpiping built grandeur through layers of shells, scrolls, drop strings, and pressure-piped borders that turned cakes into architectural centrepieces.',
          'By tracing its rise through British confectionery schools, this lesson shows how discipline, symmetry, and repetition became a decorative language of prestige.',
        ]),
      },
      {
        title: 'Buttercream Floral Piping',
        summary: 'Shows how softer buttercream piping opened cake decoration to romantic bouquets and seasonal colour stories.',
        content: buildLessonContent([
          'Buttercream floral piping softened the rigid formality of earlier styles by introducing petal movement, painterly colour, and garden-inspired composition.',
          'This lesson connects the spread of star tips, petal tips, and meringue-based icings to the popularity of wedding cakes and approachable home celebration baking.',
        ]),
      },
    ],
  },
  {
    title: 'Techniques',
    summary: 'Focuses on three hallmark methods that expanded the decorator’s toolkit with structural icing, sculpted sugar, and lightweight botanical detail.',
    lessons: [
      {
        title: 'Royal Icing Extension Work',
        summary: 'Examines the bridgework, collars, and filigree that made royal icing a structural decorative medium.',
        content: buildLessonContent([
          'Royal icing extension work pushed decorators beyond borders and plaques into collars, bridges, run-outs, and lace-like filigree.',
          'The lesson highlights how decorators combined precision templates with quick-setting icing to create delicate structures that appeared impossibly light.',
        ]),
      },
      {
        title: 'Fondant Draping and Modelling',
        summary: 'Covers the shift toward smooth modern surfaces, figurative work, and sculpted themed cakes.',
        content: buildLessonContent([
          'Fondant draping and modelling introduced clean surfaces, sculpted figures, bows, ribbons, and novelty forms that changed what clients expected from celebration cakes.',
          'This lesson explains how pliable sugar pastes supported both sleek contemporary styling and theatrical, theme-driven commissions.',
        ]),
      },
      {
        title: 'Wafer Paper Flowers',
        summary: 'Tracks the rise of lightweight edible florals that deliver movement, translucency, and scale.',
        content: buildLessonContent([
          'Wafer paper flowers gave decorators a way to create airy petals, translucent edges, and oversized botanical forms without the weight of gum paste.',
          'By studying florist influence and edible paper technology, this lesson shows why the style became a favourite for romantic and editorial cake design.',
        ]),
      },
    ],
  },
  {
    title: 'Finishing & Presentation',
    summary: 'Brings the timeline into the modern era with expressive surface finishes and a closing comparison of the six featured styles.',
    lessons: [
      {
        title: 'Palette Knife Textures',
        summary: 'Explains the contemporary move toward textured finishes inspired by painting, ceramics, and floral arranging.',
        content: buildLessonContent([
          'Palette-knife decoration trades symmetry for gesture, using thick buttercream sweeps and layered colour to create movement across the cake surface.',
          'This lesson links the look to modern editorial styling, proving that contemporary cake design often borrows its energy from painting and interior design.',
        ]),
      },
      {
        title: 'Summary',
        summary: 'Compares the six decorating styles and turns them into a usable visual timeline for future cake design decisions.',
        content: buildLessonContent([
          'The summary lesson pulls the six featured decorating styles into one comparative timeline so learners can see where each aesthetic overlaps or deliberately breaks away from the others.',
          'It closes with prompts for choosing a decorating language based on mood, ceremony, scale, and the story a finished cake needs to tell.',
        ]),
      },
    ],
  },
]

test.describe('Course workflows', () => {
  let coursePage: CoursePage
  let loginPage: APLoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new APLoginPage(page)
    coursePage = new CoursePage(page)
    await loginPage.login()
  })

  test('can create a public cake decorating history course in AP', async () => {
    test.slow()
    const apiRequest = await playwrightRequest.newContext({ baseURL: getConfiguredApiBaseURL() })
    const nexudusApi = new NexudusApiClient(apiRequest)

    try {
      const accessToken = (await nexudusApi.createBearerToken()).access_token
      const courseTitle = buildCrudName(courseBaseTitle)

      const courseId = await coursePage.createCourseShell(courseTitle)
      await coursePage.uploadCourseImages(largeCourseImagePath, smallCourseImagePath)

      const courseAfterImageUpload = await nexudusApi.getCourse(accessToken, courseId)
      expect(courseAfterImageUpload.ImageFileName, 'Expected the small course image to upload successfully.').toBeTruthy()
      expect(courseAfterImageUpload.LargeImageFileName, 'Expected the large course image to upload successfully.').toBeTruthy()

      const updatedCourse = await nexudusApi.updateCourse(accessToken, {
        ...courseAfterImageUpload,
        Active: true,
        FullDescription: courseFullDescription,
        GroupName: courseCategory,
        HasCommunityGroup: true,
        OverviewText: courseOverviewHtml,
        ShowInHomePage: true,
        ShowOverview: true,
        SummaryText: courseSummary,
        Visibility: 1,
      })

      expect(updatedCourse.Active).toBe(true)
      expect(updatedCourse.Visibility).toBe(1)
      expect(updatedCourse.ShowOverview).toBe(true)
      expect(updatedCourse.ShowInHomePage).toBe(true)
      expect(updatedCourse.HasCommunityGroup).toBe(true)

      for (const sectionPlan of cakeDecoratingCoursePlan) {
        const createdSection = await nexudusApi.createCourseSection(accessToken, {
          CourseId: courseId,
          SectionContents: sectionPlan.summary,
          Title: sectionPlan.title,
        })

        for (const lessonPlan of sectionPlan.lessons) {
          await nexudusApi.createCourseLesson(accessToken, {
            Active: true,
            CompletionType: 2,
            CourseId: courseId,
            DisplayOrder: createdSection.DisplayOrder,
            LessonContents: lessonPlan.content,
            SectionDisplayOrder: createdSection.DisplayOrder,
            SectionId: createdSection.Id,
            SectionTitle: createdSection.Title,
            SummaryText: lessonPlan.summary,
            Title: lessonPlan.title,
            UnlockType: 1,
          })
        }
      }

      const eligibleParticipants = (await nexudusApi.listCoworkers(accessToken, 250)).filter(
        (coworker) => coworker.Id !== updatedCourse.HostId && coworker.FullName?.trim(),
      )
      const selectedParticipants = pickRandomParticipants(eligibleParticipants, 3)

      for (const participant of selectedParticipants) {
        await nexudusApi.createCourseMember(accessToken, {
          CourseId: courseId,
          CoworkerId: participant.Id,
        })
      }

      await coursePage.openCourse(courseId)
      await expect(coursePage.titleInput).toHaveValue(courseTitle)
      await coursePage.assertAllLocationsSelected()
      await expect(coursePage.publishedToggle).toHaveAttribute('aria-checked', 'true')
      await expect(coursePage.showOverviewToggle).toHaveAttribute('aria-checked', 'true')
      await expect(coursePage.showInHomePageToggle).toHaveAttribute('aria-checked', 'true')
      await expect(coursePage.showDiscussionBoardToggle).toHaveAttribute('aria-checked', 'true')

      await coursePage.openLessons()

      for (const sectionPlan of cakeDecoratingCoursePlan) {
        await coursePage.expectTextVisible(sectionPlan.title)

        for (const lessonPlan of sectionPlan.lessons) {
          await coursePage.expectTextVisible(lessonPlan.title)
        }
      }

      await coursePage.openMembers()

      for (const participant of selectedParticipants) {
        await coursePage.expectTextContaining(participant.FullName!.trim())
      }

      const persistedCourse = await nexudusApi.getCourse(accessToken, courseId)
      expect(persistedCourse.Title).toBe(courseTitle)
      expect(persistedCourse.SummaryText).toBe(courseSummary)
      expect(persistedCourse.FullDescription).toBe(courseFullDescription)
      expect(persistedCourse.OverviewText).toBe(courseOverviewHtml)
      expect(persistedCourse.Visibility).toBe(1)
      expect(persistedCourse.Active).toBe(true)
      expect(persistedCourse.ShowOverview).toBe(true)
      expect(persistedCourse.ShowInHomePage).toBe(true)
      expect(persistedCourse.HasCommunityGroup).toBe(true)
      expect(persistedCourse.HostId, 'Expected the created course to keep a selected host.').toBeTruthy()
    } finally {
      await apiRequest.dispose()
    }
  })
})

function buildLessonContent(paragraphs: string[]) {
  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')
}

function pickRandomParticipants(coworkers: NexudusCoworkerResponse[], count: number) {
  const shuffledCoworkers = [...coworkers]

  for (let index = shuffledCoworkers.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const currentCoworker = shuffledCoworkers[index]

    shuffledCoworkers[index] = shuffledCoworkers[swapIndex]
    shuffledCoworkers[swapIndex] = currentCoworker
  }

  const selectedParticipants = shuffledCoworkers.slice(0, count)
  expect(selectedParticipants, `Expected at least ${count} eligible course participants to be available.`).toHaveLength(count)
  return selectedParticipants
}
