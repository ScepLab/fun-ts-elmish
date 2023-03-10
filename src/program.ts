import * as Cmd from "./cmd";

import { Cmd as Command, Dispatch } from "./cmd";

// eslint-disable-next-line @typescript-eslint/ban-types
export type Init<Model, Msg, Arg = {}> = (
    args: Arg
) => ElmishResult<Model, Msg>;

export type Subscribe<Model, Msg> = (model: Model) => Command<Msg>;

export type Update<Model, Msg> = (
    model: Model,
    msg: Msg
) => ElmishResult<Model, Msg>;

export type View<Model, Msg, ViewResult> = (
    dispatch: Dispatch<Msg>,
    model: Model
) => ViewResult;

export type SetState<Model, Msg> = (
    dispatch: Dispatch<Msg>,
    model: Model
) => void;

export type Program<Arg, Model, Msg, ViewResult> = {
    init: Init<Model, Msg, Arg>;
    subscribe: Subscribe<Model, Msg>;
    update: Update<Model, Msg>;
    view: View<Model, Msg, ViewResult>;
    setState: SetState<Model, Msg>;
};

export type ElmishResult<Model, Msg> = [Model, Command<Msg>];

export const makeProgram = <Arg, Model, Msg, ViewResult>(
    program: Pick<Program<
        Arg, Model, Msg, ViewResult
    >, "init" | "update" | "view">
): Program<Arg, Model, Msg, ViewResult> => ({
    ...program,
    subscribe: () => Cmd.none,
    setState: (model, dispatch) => { program.view(model, dispatch); }
});

// Subscribe to external source of events, overrides existing subscription.
// The subscription is called once - with the initial model, but can dispatch
// new messages at any time.
export const withSubscription = <Model, Msg>(
    subscribe: Subscribe<Model, Msg>
) => <Arg, ViewResult>(program: Program<Arg, Model, Msg, ViewResult>) =>
    ({
        ...program,
        subscribe
    });

export const withSetState = <Model, Msg>(setState: SetState<Model, Msg>) =>
    <Arg, ViewResult>(program: Program<Arg, Model, Msg, ViewResult>) =>
    ({
        ...program,
        setState
    });

// Does not work type wise
// especially <ViewResult> is not working, TViewResult results in unknown
//
// Map the program type
// export const map = <Arg, Model, Msg, TModel, TMsg, TArg, TViewResult>(
//     mapInit: (init: Init<Model, Msg, Arg>) => Init<TModel, TMsg, TArg>,
//     mapUpdate: (update: Update<Model, Msg>) => Update<TModel, TMsg>,
//     mapView: <ViewResult>(view: View<Model, Msg, ViewResult>) => View<TModel, TMsg, TViewResult>,
//     mapSetState: (setState: SetState<Model, Msg>) => SetState<TModel, TMsg>,
//     mapSubscribe: (subscribe: Subscribe<Model, Msg>) => Subscribe<TModel, TMsg>,
// ) => <ViewResult>(
//     program: Program<Arg, Model, Msg, ViewResult>
// ): Program<TArg, TModel, TMsg, TViewResult> => ({
//     init: mapInit(program.init),
//     update: mapUpdate(program.update),
//     view: mapView(program.view),
//     setState: mapSetState(program.setState),
//     subscribe: mapSubscribe(program.subscribe),
// });

const runAsync: (cb: VoidFunction) => void =
    typeof queueMicrotask === "undefined" ?
        (tick => (t: VoidFunction) => { tick.then(t); })(Promise.resolve()) :
        queueMicrotask;

export const runWith = <Arg>(arg: Arg) =>
    <Model, Msg, ViewResult>(
        program: Program<Arg, Model, Msg, ViewResult>
    ) => {
        const { init, update, subscribe, setState } = program;

        const [initModel, initCmd] = init(arg);

        const subscribeCmd = subscribe ?
            subscribe(initModel) :
            Cmd.none;

        let currentState: Model;
        runEffects([initModel, Cmd.batch(initCmd, subscribeCmd)]);

        function dispatch(msg: Msg) {
            runEffects(update(currentState, msg));
        }

        function runEffects([updatedState, cmd]: ElmishResult<Model, Msg>) {
            currentState = updatedState;

            cmd.forEach(sub => runAsync(() => sub(dispatch)));

            setState(dispatch, updatedState);
        }
    };

export const run = runWith({});
