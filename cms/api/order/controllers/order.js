'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

 const { sanitizeEntity } = require('strapi-utils');
 const unparsed = require('koa-body/unparsed.js'); // Used to extract Stripe request authentification
 const stripe = require('stripe')(strapi.config.get('server.stripePrivateKey'));
 const endpointSecret = strapi.config.get('server.stripeEndpointSecret');
 const humanizeDuration = require('humanize-duration');

 module.exports = {
  // Retrieve an order by its key (secret url slug) instead of numerical id
  async findOne(ctx) {
    const { key } = ctx.params;

    const entity = await strapi.services.order.findOne({ key });
    return sanitizeEntity(entity, { model: strapi.models.order });
  },

  // Update progress field of an order
  async update(ctx) {
    const { key } = ctx.params;

    let entity = await strapi.services.order.findOne({ key });
    entity = await strapi.services.order.update({ id: entity.id }, {
      progress: ctx.request.body.progress
    });

    return sanitizeEntity(entity, { model: strapi.models.order });
  },

  // Create order
  // Triggered as a webhook when Stripe payment is completed
  async create(ctx) {
    // Verify that post event comes from Stripe
    const signature = ctx.request.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(ctx.request.body[unparsed], signature, endpointSecret);
    } catch (error) {
      console.log(error);
    }

    // Handle the checkout.session.completed event
    // checkout.session.completed: The customer has successfully authorized the debit payment by submitting the Checkout form.
    if (event.type === 'checkout.session.completed') {

      // Create database entry
      try {
        const session = event.data.object; // Get data from Stripe session

        // Fetch customer object with Stripe API to get name field from checkout
        // https://stripe.com/docs/api/customers/retrieve?lang=node
        const customer = await stripe.customers.retrieve(session.customer);
        
        const order = {
          name: session.metadata.name, // name from chatbot
          fullName: customer.name, // name from checkout
          email: session.customer_details.email,
          price: parseInt(session.amount_total), // in cents
          time: parseInt(session.metadata.time), // in seconds
          description: session.metadata.description, // purpose of the time
          stripePaymentID: session.payment_intent,
          key: session.id,
          successUrl: session.success_url.replace('{CHECKOUT_SESSION_ID}', session.id)
        }

        const entity = await strapi.services.order.create(order);
        const entry = sanitizeEntity(entity, { model: strapi.models.order });

        // Send invoice per E-mail
        if (entity.email) {
          const email = await strapi.plugins['email'].services.email.renderMail(entity, 'time-purchased-mail');

          // Create invoice
          const invoicePdf = await strapi.plugins['email'].services.email.createInvoice(entity, 'invoice'); 

          strapi.plugins['email'].services.email.send({
            to: entity.email,
            from: 'hello@timesales.ltd',
            bcc: 'hello@timesales.ltd', // Send a blindcopy to keep track of orders
            subject: 'Thank you for ordering time',
            html: email.html,
            text: email.text, // text version is automatically generated by email-templates package
            attachments: [
              {
                filename: 'invoice.pdf',
                content: invoicePdf
              }
            ]
          })
        }

        return entry;
      } catch (error) {
        console.log(error);
      }
    }
  },

  // Create Checkout Session in Stripe and return ID
  // Reference: https://stripe.com/docs/api/checkout/sessions/object
  async createCheckoutSession(ctx) {
    const payload = ctx.request.body;
    // convert seconds from payload.time to ms and make it human readable
    const timeString = `${humanizeDuration(1000 * payload.time)} of time for – ${payload.description}`;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'sepa_debit', 'sofort'],
        locale: 'en',
        line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: timeString
            },
            unit_amount: payload.price // price is in cents
          },
          quantity: 1,
        },
        ],
        metadata: {
          name: payload.name,
          time: payload.time, // in seconds
          description: payload.description, // original user input
        },
        mode: 'payment',
        // TODO: Check wether URLs are either localhost:3000 or timesales.ltd to prevent fraud
        success_url: payload.successUrl + '?key={CHECKOUT_SESSION_ID}',
        cancel_url: payload.cancelUrl
      });

      // Return session id for the link to the Stripe checkout page
      return { id: session.id };
    } catch (err) {
      console.log(err)
    }
  },
  async createInvoice(ctx) {
    const entity = await strapi.services.order.findOne({ key: 'cs_test_a1SHMDztzyzOG6NxNyBD1bLj92PQcoRANktBdfIxPmk1cZ2JjVcBeDpxDG' });
    const pdf = await strapi.plugins['email'].services.email.createInvoice(entity, 'invoice');
    ctx.res.writeHead(200, {
      'Content-Type': 'application/pdf',
      "Content-Disposition": "attachment; filename=document.pdf",
    });
    return pdf;
  }
};
