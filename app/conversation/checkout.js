// Import conversation branches
import Exit from '../conversation/exit.js'

export default {
  mixins: [Exit],
  methods: {
    async checkout() {
      await this.botMessage('What would that time be worth to you?')

      this.d.timePrice = await (() => {
        // Show message after 10 sec if user does not enter a value
        const t1 = setTimeout(async () => {
          await this.botMessage(
            'Some people base their decisions on their hourly income, others choose a more idealistic approximation. I always ask myself <i>what amount of money would hurt a little bit?</i> That should be enough to make your time precious to you.'
          )
        }, 10000)

        // After 25 sec show another prompt
        const t2 = setTimeout(async () => {
          await this.botMessage(
            "Ultimately you'll have to ask yourself: <i>What am I willing to spend? What's appropriate and won't ruin me?</i>"
          )
        }, 25000)

        return this.botui.action
          .text({
            action: {
              sub_type: 'number',
              placeholder: 'Worth in €',
            },
          })
          .then((response) => {
            // Do not show pushy questions anymore when price is given
            this.hidePushyQuestion()
            clearTimeout(t1)
            clearTimeout(t2)
            return response.value * 100 // convert to cents
          })
      })()

      // Only continue when user enters value
      if (this.d.timePrice) {
        await this.botMessage(
          `Sweet! You chose to buy ${this.d.timeAmount} of time to ${
            this.d.timeType
          } for ${
            this.d.timePrice / 100
          } €. Do you want to proceed to checkout?`
        )

        this.showCheckoutButton = true
      }
    },
  },
}
