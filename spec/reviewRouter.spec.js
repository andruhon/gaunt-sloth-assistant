import {Command} from 'commander';
import * as td from 'testdouble';

describe('reviewRouter',  function (){

    beforeEach(async function() {
        this.review = td.function();
        this.prompt = await td.replaceEsm("../src/prompt.js");
        td.when(this.prompt.readInternalPreamble()).thenReturn("INTERNAL PREAMBLE");
        td.when(this.prompt.readPreamble(".gsloth.preamble.review.md")).thenReturn("PROJECT PREAMBLE");
        this.codeReviewMock = await td.replaceEsm("../src/codeReview.js");
        await td.replaceEsm("../src/config.js");
        this.utils = await td.replaceEsm("../src/utils.js");
        td.when(this.utils.readFileFromCurrentDir("test.file")).thenReturn("FILE TO REVIEW");
        td.when(this.codeReviewMock.review(
            'sloth-DIFF-review',
            td.matchers.anything(),
            td.matchers.anything())
        ).thenDo(this.review);
    });

    it('Should pall review with file contents', async function() {
        const { reviewRouter } = await import("../src/reviewRouter.js");
        const program = new Command()
        await reviewRouter(program, {});
        await program.parseAsync(['na', 'na', 'review', '-f', 'test.file']);
        td.verify(this.review('sloth-DIFF-review', "INTERNAL PREAMBLE\nPROJECT PREAMBLE", "FILE TO REVIEW"));
    });

});
