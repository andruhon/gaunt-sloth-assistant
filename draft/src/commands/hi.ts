import chalk from 'chalk';
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { HumanMessage } from '@langchain/core/messages';

export const hiCommand = async (): Promise<void> => {
  const chat = new FakeListChatModel({
    responses: ["Hi! How are you?"],
  });

  const response = await chat.call([new HumanMessage("Hello")]);
  console.log(chalk.green(response.content));
}; 