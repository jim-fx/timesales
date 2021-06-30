// Import conversation branches
import CapitalismDiscourse from '../conversation/capitalismDiscourse.js'
import InvestInArt from '../conversation/investInArt.js'
import ProjectsToFinish from '../conversation/projectsToFinish.js'

export default {
  mixins: [CapitalismDiscourse, InvestInArt, ProjectsToFinish],
  methods: {
    async welcome() {
      await this.botMessage('Hi, good to see you!')

      await this.botMessage("What's your name?")

      await this.botTextInput('Your name').then((name) => {
        // Save reponses in vuex store
        this.setResponse({ name })
      })

      await this.botMessage(
        this.response.name +
          ', nice to meet you. Would it be okay if I record our conversation to improve the quality of service?'
      )

      await this.botYesOrNo().then((allowRecording) => {
        this.setResponse({ allowRecording })
      })

      await this.botMessage('Are you sometimes short on time?')

      // When user does not answer question afters 10 secs proceed to projects to finish dialogue
      const question = this.timeout(10000, this.botYesOrNo())

      question.then((response) => {
        if (response === undefined) {
          this.botui.action.hide() // Remove answer possibility to this question
          this.setResponse({ shortOnTime: 'hesitant' })
          this.projectsToFinish()
        } else {
          const shortOnTime = response
          this.setResponse({ shortOnTime })
          shortOnTime ? this.capitalismDiscourse() : this.investInArt()
        }
      })
    },
  },
}
