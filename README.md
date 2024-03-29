<blockquote class="mb-8"><p>The framework is a collection of tools and principles used to make creating pattern libraries fun for developers, transparent for teams, and sustainable beyond the lifecycle of digital products.</p></blockquote>

<!-- > The framework is a collection of tools and principles used to make creating pattern libraries fun for developers, transparent for teams, and sustainable beyond the lifecycle of digital products. -->

## Why Patterns?

<div class="shadow-up"><div class="color-primary-background border-navy p-4 h4 mb-3">

**Pattern libraries unify the experience of user interfaces because they can be integrated into different service delivery channels.**

</div></div>

The public does not perceive the parts that make up digital government services as distinct products the way civil servants do. Websites, forms, mobile apps, dashboards, email newsletters, etc. are often perceived as a single entity. The more consistent these are from a user interface (UI) and user experience (UX) perspective the better the service delivery will be for end-users.

<div class="shadow-up"><div class="color-primary-background border-navy p-4 h4 mb-3 mt-6">

**They reduce the amount of work that is required by designers and developers to implement new services**.

</div></div>

By using patterns we can strive toward "making the right thing to do the easiest thing to do." We can use tools that help developers become better at writing error free code, ensure the team adheres to accessibility standards, and create UIs that have been proven to work **and** can adapt to the changing times.

<div class="shadow-up"><div class="color-primary-background border-navy p-4 h4 mb-3 mt-6">

**They create a common and accessible language for the organization to approach digital service delivery**.

</div></div>

"Language is fundamental to collaboration. If you work in a team, your design language needs to be shared among the people involved in the creation of the product. Without a shared language, a group of people can't create effectively together – each person will have a different mental model of what they're trying to achieve." - [**Design Systems**](https://www.smashingmagazine.com/design-systems-book) *by Alla Kholmatova*.

## Principles

**[Atomic Design](https://atomicdesign.bradfrost.com/) and [Utility-first](https://tailwindcss.com/docs/utility-first)** - A pattern library starts with simple [design tokens](https://www.lightningdesignsystem.com/design-tokens/) such as color, typographic features, and spacing values then scales up from there. Design tokens are used to build out more complex components, scripts, and utilities that retain modularity.

**Framework Agnostic** - Use [React](https://reactjs.org), [Svelte](https://svelte.dev), or [Vue.js](https://vuejs.org) to add reactivity to user interface components. Manage your own copy of [Bootstrap](https://getbootstrap.com), [Material UI](https://mui.com), [Foundation](https://get.foundation/), or any of the many component libraries of choice.

**Modular Distribution and Portability** - Make it once, use it many times. Instead of copying and pasting CSS and JavaScript into multiple projects, reuse and extend pattern libraries with a modern front-end ecosystem such as [NPM](https://www.npmjs.com) and distribute via content-delivery-network.

## Getting Started

Scaffold your own library or project by running the following command.

```shell
npx @nycopportunity/pttrn scaffold && npm i && npx pttrn build && npm start
```

This will install the [Patterns Command Line Interface](https://github.com/cityofnewyork/patterns-cli) described below, scaffold a new static library project, and start the development server.

### But I don't write code!

No worries! Then perhaps try documenting your pattern library specs in a [Figma](https://www.figma.com/design-systems/) design file first and share this with your development team.
