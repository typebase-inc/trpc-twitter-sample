import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { tweetContentSchema } from "~/validations/tweet";

export const tweetRouter = createTRPCRouter({
  add: protectedProcedure
    .input(tweetContentSchema)
    .mutation(async ({ ctx, input }) => {
      const { content } = input;
      const { user } = ctx.session;
      const tweet = await ctx.prisma.tweet.create({
        data: {
          content,
          userId: user.id,
        },
        include: {
          from: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          likes: true,
        },
      });
      return tweet;
    }),
  getAllByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.tweet.findMany({
        where: {
          userId: input.userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          from: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          likes: true,
        },
      });
    }),
  getAll: publicProcedure
    .input(z.object({ cursor: z.string().nullish() }))
    .query(async ({ ctx, input }) => {
      const take = 10;
      const { cursor } = input;
      const tweets = await ctx.prisma.tweet.findMany({
        take: take + 1,
        orderBy: {
          createdAt: "desc",
        },
        cursor: cursor ? { id: cursor } : undefined,
        include: {
          from: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          likes: true,
        },
      });
      let nextCursor: typeof cursor | undefined = undefined;
      if (tweets.length > take) {
        const nextTweet = tweets.pop();
        nextCursor = nextTweet?.id;
      }
      return {
        tweets,
        nextCursor,
      };
    }),
});
