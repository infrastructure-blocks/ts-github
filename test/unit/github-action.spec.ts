import {
  arrayInput,
  booleanInput,
  checkSupportedEvent,
  Event,
  getInputs,
  Outputs,
  parseEvent,
  parseOutputs,
  runActionHandler,
  setOutputs,
  stringInput,
} from "../../src/index.js";
import { awaiter, expect, resetEnvFixture } from "@infra-blocks/test";
import * as sinon from "sinon";
import { readFile } from "node:fs/promises";
import { withFile } from "tmp-promise";
import * as core from "@actions/core";

describe("github-action", function () {
  describe(parseEvent.name, function () {
    it("should work with push event", function () {
      expect(parseEvent("push")).to.equal(Event.Push);
    });
    it("should work with pull request event", function () {
      expect(parseEvent("pull_request")).to.equal(Event.PullRequest);
    });
    it("should fail on unknown event type", function () {
      expect(() => parseEvent("rebuild_errthang")).to.throw();
    });
  });
  describe(checkSupportedEvent.name, function () {
    it("should work with a single supported event", function () {
      expect(checkSupportedEvent("push", [Event.Push])).to.equal(Event.Push);
    });
    it("should work with an event that is part of a supported group", function () {
      expect(
        checkSupportedEvent("pull_request", [Event.Push, Event.PullRequest])
      ).to.equal(Event.PullRequest);
    });
    it("should throw if there are no supported events", function () {
      expect(() => checkSupportedEvent("push", [])).to.throw();
    });
    it("should throw if the event cannot be parsed", function () {
      expect(() => checkSupportedEvent("toto", [Event.Push])).to.throw();
    });
    it("should throw if the event is not supported", function () {
      expect(() => checkSupportedEvent("push", [Event.PullRequest])).to.throw();
    });
  });
  describe(getInputs.name, function () {
    afterEach("reset process.env", resetEnvFixture());

    describe(stringInput.name, function () {
      it("should throw if the input is not defined", function () {
        expect(() =>
          getInputs({
            test: stringInput(),
          })
        ).to.throw();
      });
      it("should return the default value if the input is not defined", function () {
        const inputs: { cannotBeUndefined: string } = getInputs({
          cannotBeUndefined: stringInput({ default: "that's the value" }),
        });
        expect(inputs.cannotBeUndefined).to.equal("that's the value");
      });
      it("should return the default value if the input is an empty string", function () {
        process.env.INPUT_CANNOTBEUNDEFINED = "";
        const inputs: { cannotBeUndefined: string } = getInputs({
          cannotBeUndefined: stringInput({ default: "that's the value" }),
        });
        expect(inputs.cannotBeUndefined).to.equal("that's the value");
      });
      it("should return the default value of undefined if the input is not defined", function () {
        const inputs = getInputs({
          canBeUndefined: stringInput({ default: undefined }),
        });
        // Making sure it's marked as potentially undefined.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const compilationTest: typeof inputs.canBeUndefined = undefined;
        expect(inputs.canBeUndefined).to.be.undefined;
      });
      it("should return the expected value if the input is defined", function () {
        process.env.INPUT_TEST2 = "good";
        // Adding types to make sure it compiles as expected.
        const inputs: { test2: string } = getInputs({
          test2: stringInput(),
        });
        expect(inputs.test2).to.equal("good");
      });
      it("should return the expected value when the options are an empty object", function () {
        process.env.INPUT_STUFF = "empty-object";
        // Adding types to make sure it compiles as expected.
        const inputs: { stuff: string } = getInputs({
          stuff: stringInput({}),
        });
        expect(inputs.stuff).to.equal("empty-object");
      });
      it("should work with a valid choice value", function () {
        process.env.INPUT_CHOICE = "two";

        // Adding types to make sure it compiles as expected.
        type Choice = "one" | "two" | "three";
        const inputs: { choice: Choice } = getInputs({
          choice: stringInput<Choice>({ choices: ["one", "two", "three"] }),
        });
        expect(inputs.choice).to.equal("two");
      });
      it("should work with a default choice value", function () {
        // Adding types to make sure it compiles as expected.
        type Choice = "one" | "two" | "three";
        const inputs: { choice: Choice } = getInputs({
          choice: stringInput<Choice>({
            choices: ["one", "two", "three"],
            default: "one",
          }),
        });
        expect(inputs.choice).to.equal("one");
      });
      it("should work with a default choice value of undefined", function () {
        type Choice = "one" | "two" | "three";
        const inputs: { choice: Choice | undefined } = getInputs({
          choice: stringInput<Choice>({
            choices: ["one", "two", "three"],
            default: undefined,
          }),
        });
        expect(inputs.choice).to.be.undefined;
      });
      it("should throw for an invalid choice value", function () {
        process.env.INPUT_CHOICE = "four";
        expect(() =>
          getInputs({
            choice: stringInput({ choices: ["one", "two", "three"] }),
          })
        ).to.throw();
      });
    });

    describe(arrayInput.name, function () {
      it("should throw if the input is not defined", function () {
        expect(() =>
          getInputs({
            test: arrayInput(),
          })
        ).to.throw();
      });
      it("should return the default value if one is provided and the value is not defined", function () {
        const inputs: { cannotBeUndefined: ReadonlyArray<string> } = getInputs({
          cannotBeUndefined: arrayInput({ default: ["big-default"] }),
        });
        expect(inputs.cannotBeUndefined).to.deep.equal(["big-default"]);
      });
      it("should return the default value if one is provided and the value is an empty string", function () {
        process.env.INPUT_CANNOTBEUNDEFINED = "";
        const inputs: { cannotBeUndefined: ReadonlyArray<string> } = getInputs({
          cannotBeUndefined: arrayInput({ default: ["big-default"] }),
        });
        expect(inputs.cannotBeUndefined).to.deep.equal(["big-default"]);
      });
      it("should return the default value of undefined if the input is not defined", function () {
        const inputs = getInputs({
          canBeUndefined: arrayInput({ default: undefined }),
        });
        // Making sure it's marked as potentially undefined.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const compilationTest: typeof inputs.canBeUndefined = undefined;
        expect(inputs.canBeUndefined).to.be.undefined;
      });
      it("should return the expected value if it is defined", function () {
        process.env.INPUT_STUFF = "hello, there";
        const inputs: { stuff: ReadonlyArray<string> } = getInputs({
          stuff: arrayInput(),
        });
        expect(inputs.stuff).to.deep.equal(["hello", " there"]);
      });
      it("should return the expected value if it is defined and the options are an empty object", function () {
        process.env.INPUT_STUFF = "hello, there";
        const inputs: { stuff: ReadonlyArray<string> } = getInputs({
          stuff: arrayInput({}),
        });
        expect(inputs.stuff).to.deep.equal(["hello", " there"]);
      });
      it("should respect the separator option", function () {
        process.env.INPUT_SPACEWORDS = "hello there is it me you looking for";
        const inputs: { spaceWords: ReadonlyArray<string> } = getInputs({
          spaceWords: arrayInput({ separator: " " }),
        });
        expect(inputs.spaceWords).to.deep.equal([
          "hello",
          "there",
          "is",
          "it",
          "me",
          "you",
          "looking",
          "for",
        ]);
      });
      it("should respect the trim option", function () {
        process.env.INPUT_TRIMME = "1 ,    2,   3    , 4";
        const inputs: { trimMe: ReadonlyArray<string> } = getInputs({
          trimMe: arrayInput({ separator: ",", trim: true }),
        });
        expect(inputs.trimMe).to.deep.equal(["1", "2", "3", "4"]);
      });
    });

    describe(booleanInput.name, function () {
      it("should throw if the input is not defined", function () {
        expect(() =>
          getInputs({
            test: booleanInput(),
          })
        ).to.throw();
      });
      it("should return the default value if the input is not defined", function () {
        const inputs: { cannotBeUndefined: boolean } = getInputs({
          cannotBeUndefined: booleanInput({ default: false }),
        });
        expect(inputs.cannotBeUndefined).to.be.false;
      });
      it("should return the default value if the input is an empty string", function () {
        process.env.INPUT_CANNOTBEUNDEFINED = "";
        const inputs: { cannotBeUndefined: boolean } = getInputs({
          cannotBeUndefined: booleanInput({ default: false }),
        });
        expect(inputs.cannotBeUndefined).to.be.false;
      });
      it("should return the default value of undefined if the input is not defined", function () {
        const inputs = getInputs({
          canBeUndefined: booleanInput({ default: undefined }),
        });
        // Making sure it's marked as potentially undefined.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const compilationTest: typeof inputs.canBeUndefined = undefined;
        expect(inputs.canBeUndefined).to.be.undefined;
      });
      it("should return the expected value if the input is true", function () {
        process.env.INPUT_VALUE = "true";
        // Adding types to make sure it compiles as expected.
        const inputs: { value: boolean } = getInputs({
          value: booleanInput(),
        });
        expect(inputs.value).to.be.true;
      });
      it("should return the expected value if the input is false", function () {
        process.env.INPUT_VALUE = "false";
        // Adding types to make sure it compiles as expected.
        const inputs: { value: boolean } = getInputs({
          value: booleanInput(),
        });
        expect(inputs.value).to.be.false;
      });
      it("should throw if the input is an invalid boolean", function () {
        process.env.INPUT_VALUE = "falsy";
        // Adding types to make sure it compiles as expected.
        expect(() =>
          getInputs({
            value: booleanInput(),
          })
        ).to.throw();
      });
    });

    it("works with a bunch of different entries", function () {
      interface Inputs {
        snake_string: string;
        camelCaseString: string;
        "with spaces": string;
        withDefault: string;
        withUndefinedDefault: string | undefined;
        csvArray: readonly string[];
        spaceArray: readonly string[];
      }

      process.env.INPUT_SNAKE_STRING = "yessssssssnake";
      process.env.INPUT_CAMELCASESTRING = "camel cased";
      process.env.INPUT_WITH_SPACES = "you didn't know that worked, did you?";
      process.env.INPUT_CSVARRAY = "one, two, three, four";
      process.env.INPUT_SPACEARRAY = "five six seven eight";

      const inputs: Inputs = getInputs({
        snake_string: stringInput(),
        camelCaseString: stringInput(),
        "with spaces": stringInput(),
        withDefault: stringInput({ default: "hello" }),
        withUndefinedDefault: stringInput({ default: undefined }),
        csvArray: arrayInput(),
        spaceArray: arrayInput({ separator: " " }),
      });

      expect(inputs.snake_string).to.equal("yessssssssnake");
      expect(inputs.camelCaseString).to.equal("camel cased");
      expect(inputs["with spaces"]).to.equal(
        "you didn't know that worked, did you?"
      );
      expect(inputs.withDefault).to.equal("hello");
      expect(inputs.withUndefinedDefault).to.be.undefined;
      expect(inputs.csvArray).to.deep.equal(["one", " two", " three", " four"]);
      expect(inputs.spaceArray).to.deep.equal([
        "five",
        "six",
        "seven",
        "eight",
      ]);
    });
  });
  describe(parseOutputs.name, function () {
    afterEach("reset process.env", resetEnvFixture());

    it("should work with an empty file", async function () {
      await withFile(async (tempFile) => {
        const filePath = tempFile.path;
        expect(await parseOutputs(filePath)).to.deep.equal({});
      });
    });
    it("should work with a single string output", async function () {
      await withFile(async (tempFile) => {
        process.env.GITHUB_OUTPUT = tempFile.path;
        const stringValue = "tata";
        core.setOutput("toto", stringValue);
        expect(await parseOutputs()).to.deep.equal({
          toto: stringValue,
        });
      });
    });
    it("should work with weird keys", async function () {
      await withFile(async (tempFile) => {
        process.env.GITHUB_OUTPUT = tempFile.path;
        const stringValue = "   anything    ";
        core.setOutput("  t_0/T-o  ", stringValue);
        expect(await parseOutputs()).to.deep.equal({
          "  t_0/T-o  ": stringValue,
        });
      });
    });
    it("should work with a JSON array output", async function () {
      await withFile(async (tempFile) => {
        process.env.GITHUB_OUTPUT = tempFile.path;
        const arrayValue = ["one", 2, false, null];
        core.setOutput("array", arrayValue);
        expect(await parseOutputs()).to.deep.equal({
          array: JSON.stringify(arrayValue),
        });
      });
    });
    it("should work with a JSON object output", async function () {
      await withFile(async (tempFile) => {
        process.env.GITHUB_OUTPUT = tempFile.path;
        const objectValue = {
          string: "hello",
          number: 5,
          boolean: true,
          array: ["1", 2, false, null],
          null: null,
        };
        core.setOutput("object", objectValue);
        expect(await parseOutputs()).to.deep.equal({
          object: JSON.stringify(objectValue),
        });
      });
    });
    it("should work with several outputs", async function () {
      await withFile(async (tempFile) => {
        process.env.GITHUB_OUTPUT = tempFile.path;
        const stringValue = "Hello World!";
        const arrayValue = [1, "two", true, null];
        const objectValue = {
          string: "hello",
          number: 5,
          boolean: true,
          array: ["1", 2, false, null],
          null: null,
        };
        core.setOutput("string", stringValue);
        core.setOutput("array", arrayValue);
        core.setOutput("object", objectValue);
        expect(await parseOutputs()).to.deep.equal({
          string: stringValue,
          array: JSON.stringify(arrayValue),
          object: JSON.stringify(objectValue),
        });
      });
    });
    it("should work with repeating outputs", async function () {
      await withFile(async (tempFile) => {
        process.env.GITHUB_OUTPUT = tempFile.path;
        const firstStringValue = "Hello World!";
        const secondStringValue = "Anybody here?";
        const thirdStringValue = "You want that output or what?";

        core.setOutput("string", firstStringValue);
        core.setOutput("string", secondStringValue);
        core.setOutput("string", thirdStringValue);
        expect(await parseOutputs()).to.deep.equal({
          string: thirdStringValue,
        });
      });
    });
    it("should throw if no file path could be determined", async function () {
      delete process.env.GITHUB_OUTPUT;
      await expect(parseOutputs()).to.be.rejected;
    });
  });
  describe(runActionHandler.name, function () {
    afterEach("reset process.env", resetEnvFixture());

    it("should work without inputs and outputs", async function () {
      await withFile(async (tempFile) => {
        process.env.GITHUB_OUTPUT = tempFile.path;
        const handler = sinon.fake.resolves<
          [Record<string, never>],
          Promise<Record<string, never>>
        >({});
        const { func, promise } = awaiter(handler);

        runActionHandler({}, func);
        await promise;
        expect(handler).to.have.been.calledOnceWith();
        expect(await parseOutputs()).to.deep.equal({});
      });
    });
    it("should work with outputs", async function () {
      interface TestOutputs extends Outputs {
        "my-beautiful-output": string;
      }
      const outputs: TestOutputs = {
        "my-beautiful-output": "word",
      };
      await withFile(async (tempFile) => {
        process.env.GITHUB_OUTPUT = tempFile.path;
        const handler = sinon.fake.resolves<
          [Record<string, never>],
          Promise<TestOutputs>
        >(outputs);
        const { func, promise } = awaiter(handler);

        runActionHandler({}, func);
        await promise;
        expect(handler).to.have.been.calledOnceWith();
        expect(await parseOutputs()).to.deep.equal(outputs);
      });
    });
    it("should work with inputs", async function () {
      interface Inputs {
        left: string;
        right: string;
        military: string;
        step: boolean;
      }

      await withFile(async (tempFile) => {
        process.env.GITHUB_OUTPUT = tempFile.path;
        const handler = sinon.fake.resolves<
          [Inputs],
          Promise<Record<string, never>>
        >({});
        const { func, promise } = awaiter(handler);

        process.env.INPUT_LEFT = "left";
        process.env.INPUT_RIGHT = "right";
        process.env.INPUT_MILITARY = "military";
        process.env.INPUT_STEP = "false";

        runActionHandler(
          {
            left: stringInput(),
            right: stringInput(),
            military: stringInput(),
            step: booleanInput(),
          },
          func
        );
        await promise;
        expect(handler).to.have.been.calledOnceWith({
          left: "left",
          right: "right",
          military: "military",
          step: false,
        });
        expect(await parseOutputs()).to.deep.equal({});
      });
    });
  });
});
