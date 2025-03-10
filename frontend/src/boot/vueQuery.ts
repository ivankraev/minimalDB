import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import { defineBoot } from '#q-app/wrappers';

export default defineBoot(({ app }) => {
  const queryClient = new QueryClient();
  app.use(VueQueryPlugin, { queryClient });
});
//
